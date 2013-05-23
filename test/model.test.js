var model = require('../lib/model')
  , should = require('chai').should()
  , assert = require('chai').assert
  , _ = require('underscore')
  , async = require('async')
  ;


describe('Model', function () {

  describe('Serialization, deserialization', function () {

    it('Can serialize and deserialize strings', function () {
      var a, b, c;

      a = { test: "Some string" };
      b = model.serialize(a);
      c = model.deserialize(b);
      b.indexOf('\n').should.equal(-1);
      c.test.should.equal("Some string");

      // Even if a property is a string containing a new line, the serialized
      // version doesn't. The new line must still be there upon deserialization
      a = { test: "With a new\nline" };
      b = model.serialize(a);
      c = model.deserialize(b);
      c.test.should.equal("With a new\nline");
      a.test.indexOf('\n').should.not.equal(-1);
      b.indexOf('\n').should.equal(-1);
      c.test.indexOf('\n').should.not.equal(-1);
    });

    it('Can serialize and deserialize booleans', function () {
      var a, b, c;

      a = { test: true };
      b = model.serialize(a);
      c = model.deserialize(b);
      b.indexOf('\n').should.equal(-1);
      c.test.should.equal(true);
    });

    it('Can serialize and deserialize numbers', function () {
      var a, b, c;

      a = { test: 5 };
      b = model.serialize(a);
      c = model.deserialize(b);
      b.indexOf('\n').should.equal(-1);
      c.test.should.equal(5);
    });

    it('Can serialize and deserialize null', function () {
      var a, b, c;

      a = { test: null };
      b = model.serialize(a);
      c = model.deserialize(b);
      b.indexOf('\n').should.equal(-1);
      assert.isNull(a.test);
    });

    it('undefined fields are removed when serialized', function() {
      var a = { bloup: undefined, hello: 'world' }
        , b = model.serialize(a)
        , c = model.deserialize(b)
        ;

      Object.keys(c).length.should.equal(1);
      c.hello.should.equal('world');
      assert.isUndefined(c.bloup);
    });

    it('Can serialize and deserialize a date', function () {
      var a, b, c
        , d = new Date();

      a = { test: d };
      b = model.serialize(a);
      c = model.deserialize(b);
      b.indexOf('\n').should.equal(-1);
      c.test.constructor.name.should.equal('Date');
      c.test.getTime().should.equal(d.getTime());
    });

    it('Can serialize and deserialize sub objects', function () {
      var a, b, c
        , d = new Date();

      a = { test: { something: 39, also: d, yes: { again: 'yes' } } };
      b = model.serialize(a);
      c = model.deserialize(b);
      b.indexOf('\n').should.equal(-1);
      c.test.something.should.equal(39);
      c.test.also.getTime().should.equal(d.getTime());
      c.test.yes.again.should.equal('yes');
    });

    it('Can serialize and deserialize sub arrays', function () {
      var a, b, c
        , d = new Date();

      a = { test: [ 39, d, { again: 'yes' } ] };
      b = model.serialize(a);
      c = model.deserialize(b);
      b.indexOf('\n').should.equal(-1);
      c.test[0].should.equal(39);
      c.test[1].getTime().should.equal(d.getTime());
      c.test[2].again.should.equal('yes');
    });

    it('Reject field names beginning with a $ sign', function (done) {
      var a = { $something: 'totest' }
        , b;

      try {
        b = model.serialize(a);
        return done('An error should have been thrown');
      } catch (e) {
        return done();
      }
    });

  });   // ==== End of 'Serialization, deserialization' ==== //


  describe('Object checking', function () {

    it('Field names beginning with a $ sign are forbidden', function () {
      assert.isDefined(model.checkObject);

      (function () {
        model.checkObject({ $bad: true });
      }).should.throw();

      (function () {
        model.checkObject({ some: 42, nested: { again: "no", $worse: true } });
      }).should.throw();

      // This shouldn't throw since "$actuallyok" is not a field name
      model.checkObject({ some: 42, nested: [ 5, "no", "$actuallyok", true ] });

      (function () {
        model.checkObject({ some: 42, nested: [ 5, "no", "$actuallyok", true, { $hidden: "useless" } ] });
      }).should.throw();
    });

    it('Field names cannot contain a .', function () {
      assert.isDefined(model.checkObject);

      (function () {
        model.checkObject({ "so.bad": true });
      }).should.throw();

      // Recursive behaviour testing done in the above test on $ signs
    });

  });   // ==== End of 'Object checking' ==== //


  describe('Deep copying', function () {

    it('Should be able to deep copy any serializable model', function () {
      var d = new Date()
        , obj = { a: ['ee', 'ff', 42], date: d, subobj: { a: 'b', b: 'c' } }
        , res = model.deepCopy(obj);
        ;

      res.a.length.should.equal(3);
      res.a[0].should.equal('ee');
      res.a[1].should.equal('ff');
      res.a[2].should.equal(42);
      res.date.getTime().should.equal(d.getTime());
      res.subobj.a.should.equal('b');
      res.subobj.b.should.equal('c');

      obj.a.push('ggg');
      obj.date = 'notadate';
      obj.subobj = [];

      // Even if the original object is modified, the copied one isn't
      res.a.length.should.equal(3);
      res.a[0].should.equal('ee');
      res.a[1].should.equal('ff');
      res.a[2].should.equal(42);
      res.date.getTime().should.equal(d.getTime());
      res.subobj.a.should.equal('b');
      res.subobj.b.should.equal('c');
    });

  });   // ==== End of 'Deep copying' ==== //


  describe('Modifying documents', function () {

    it('Queries not containing any modifier just replace the document by the contents of the query but keep its _id', function () {
      var obj = { some: 'thing', _id: 'keepit' }
        , updateQuery = { replace: 'done', bloup: [ 1, 8] }
        , t
        ;

      t = model.modify(obj, updateQuery);
      t.replace.should.equal('done');
      t.bloup.length.should.equal(2);
      t.bloup[0].should.equal(1);
      t.bloup[1].should.equal(8);

      assert.isUndefined(t.some);
      t._id.should.equal('keepit');
    });

    it('Throw an error if trying to change the _id field in a copy-type modification', function () {
      var obj = { some: 'thing', _id: 'keepit' }
        , updateQuery = { replace: 'done', bloup: [ 1, 8], _id: 'donttryit' }
        ;

      (function () {
        model.modify(obj, updateQuery);
      }).should.throw();

      updateQuery._id = 'keepit';
      model.modify(obj, updateQuery);   // No error thrown
    });

    it('Throw an error if trying to use modify in a mixed copy+modify way', function () {
      var obj = { some: 'thing' }
        , updateQuery = { replace: 'me', $modify: 'metoo' };

      (function () {
        model.modify(obj, updateQuery);
      }).should.throw();
    });

    it('Throw an error if trying to use an inexistent modifier', function () {
      var obj = { some: 'thing' }
        , updateQuery = { $set: 'this exists', $modify: 'not this one' };

      (function () {
        model.modify(obj, updateQuery);
      }).should.throw();
    });

    it('Throw an error if a modifier is used with a non-object argument', function () {
      var obj = { some: 'thing' }
        , updateQuery = { $set: 'this exists' };

      (function () {
        model.modify(obj, updateQuery);
      }).should.throw();
    });

    describe('$set modifier', function () {
      it('Can change already set fields without modfifying the underlying object', function () {
        var obj = { some: 'thing', yup: 'yes', nay: 'noes' }
          , updateQuery = { $set: { some: 'changed', nay: 'yes indeed' } }
          , modified = model.modify(obj, updateQuery);

        Object.keys(modified).length.should.equal(3);
        modified.some.should.equal('changed');
        modified.yup.should.equal('yes');
        modified.nay.should.equal('yes indeed');

        Object.keys(obj).length.should.equal(3);
        obj.some.should.equal('thing');
        obj.yup.should.equal('yes');
        obj.nay.should.equal('noes');
      });

      it('Creates fields to set if they dont exist yet', function () {
        var obj = { yup: 'yes' }
          , updateQuery = { $set: { some: 'changed', nay: 'yes indeed' } }
          , modified = model.modify(obj, updateQuery);

        Object.keys(modified).length.should.equal(3);
        modified.some.should.equal('changed');
        modified.yup.should.equal('yes');
        modified.nay.should.equal('yes indeed');
      });

      it('Can set sub-fields and create them if necessary', function () {
        var obj = { yup: { subfield: 'bloup' } }
          , updateQuery = { $set: { "yup.subfield": 'changed', "yup.yop": 'yes indeed', "totally.doesnt.exist": 'now it does' } }
          , modified = model.modify(obj, updateQuery);

        _.isEqual(modified, { yup: { subfield: 'changed', yop: 'yes indeed' }, totally: { doesnt: { exist: 'now it does' } } }).should.equal(true);
      });
    });

    describe('$inc modifier', function () {
      it('Throw an error if you try to use it with a non-number or on a non number field', function () {
        (function () {
        var obj = { some: 'thing', yup: 'yes', nay: 2 }
          , updateQuery = { $inc: { nay: 'notanumber' } }
          , modified = model.modify(obj, updateQuery);
        }).should.throw();

        (function () {
        var obj = { some: 'thing', yup: 'yes', nay: 'nope' }
          , updateQuery = { $inc: { nay: 1 } }
          , modified = model.modify(obj, updateQuery);
        }).should.throw();
      });

      it('Can increment number fields or create and initialize them if needed', function () {
        var obj = { some: 'thing', nay: 40 }
          , modified;

        modified = model.modify(obj, { $inc: { nay: 2 } });
        _.isEqual(modified, { some: 'thing', nay: 42 }).should.equal(true);

        // Incidentally, this tests that obj was not modified
        modified = model.modify(obj, { $inc: { inexistent: -6 } });
        _.isEqual(modified, { some: 'thing', nay: 40, inexistent: -6 }).should.equal(true);
      });

      it('Works recursively', function () {
        var obj = { some: 'thing', nay: { nope: 40 } }
          , modified;

        modified = model.modify(obj, { $inc: { "nay.nope": -2, "blip.blop": 123 } });
        _.isEqual(modified, { some: 'thing', nay: { nope: 38 }, blip: { blop: 123 } }).should.equal(true);
      });
    });

  });   // ==== End of 'Modifying documents' ==== //


  describe('Querying', function () {

    describe('Comparing things', function () {

      it('Two things of different types cannot be equal, two identical native things are equal', function () {
        var toTest = [null, 'somestring', 42, true, new Date(72998322), { hello: 'world' }]
          , toTestAgainst = [null, 'somestring', 42, true, new Date(72998322), { hello: 'world' }]   // Use another array so that we don't test pointer equality
          , i, j
          ;

        for (i = 0; i < toTest.length; i += 1) {
          for (j = 0; j < toTestAgainst.length; j += 1) {
            model.areThingsEqual(toTest[i], toTestAgainst[j]).should.equal(i === j);
          }
        }
      });

      it('Can test native types null undefined string number boolean date equality', function () {
        var toTest = [null, undefined, 'somestring', 42, true, new Date(72998322), { hello: 'world' }]
          , toTestAgainst = [undefined, null, 'someotherstring', 5, false, new Date(111111), { hello: 'mars' }]
          , i
          ;

        for (i = 0; i < toTest.length; i += 1) {
          model.areThingsEqual(toTest[i], toTestAgainst[i]).should.equal(false);
        }
      });

      it('If one side is an array or undefined, comparison fails', function () {
        var toTestAgainst = [null, undefined, 'somestring', 42, true, new Date(72998322), { hello: 'world' }]
          , i
          ;

        for (i = 0; i < toTestAgainst.length; i += 1) {
          model.areThingsEqual([1, 2, 3], toTestAgainst[i]).should.equal(false);
          model.areThingsEqual(toTestAgainst[i], []).should.equal(false);

          model.areThingsEqual(undefined, toTestAgainst[i]).should.equal(false);
          model.areThingsEqual(toTestAgainst[i], undefined).should.equal(false);
        }
      });

      it('Can test objects equality', function () {
        model.areThingsEqual({ hello: 'world' }, {}).should.equal(false);
        model.areThingsEqual({ hello: 'world' }, { hello: 'mars' }).should.equal(false);
        model.areThingsEqual({ hello: 'world' }, { hello: 'world', temperature: 42 }).should.equal(false);
        model.areThingsEqual({ hello: 'world', other: { temperature: 42 }}, { hello: 'world', other: { temperature: 42 }}).should.equal(true);
      });

    });


    describe('Getting a fields value in dot notation', function () {

      it('Return first-level and nested values', function () {
        model.getDotValue({ hello: 'world' }, 'hello').should.equal('world');
        model.getDotValue({ hello: 'world', type: { planet: true, blue: true } }, 'type.planet').should.equal(true);
      });

      it('Return undefined if the field cannot be found in the object', function () {
        assert.isUndefined(model.getDotValue({ hello: 'world' }, 'helloo'));
        assert.isUndefined(model.getDotValue({ hello: 'world', type: { planet: true } }, 'type.plane'));
      });

    });


    describe('Field equality', function () {

      it('Can find documents with simple fields', function () {
        model.match({ test: 'yeah' }, { test: 'yea' }).should.equal(false);
        model.match({ test: 'yeah' }, { test: 'yeahh' }).should.equal(false);
        model.match({ test: 'yeah' }, { test: 'yeah' }).should.equal(true);
      });

      it('Can find documents with the dot-notation', function () {
        model.match({ test: { ooo: 'yeah' } }, { "test.ooo": 'yea' }).should.equal(false);
        model.match({ test: { ooo: 'yeah' } }, { "test.oo": 'yeah' }).should.equal(false);
        model.match({ test: { ooo: 'yeah' } }, { "tst.ooo": 'yeah' }).should.equal(false);
        model.match({ test: { ooo: 'yeah' } }, { "test.ooo": 'yeah' }).should.equal(true);
      });

      it('Cannot find undefined', function () {
        model.match({ test: undefined }, { test: undefined }).should.equal(false);
        model.match({ test: { pp: undefined } }, { "test.pp": undefined }).should.equal(false);
      });

      it('For an array field, a match means a match on at least one element', function () {
        model.match({ tags: ['node', 'js', 'db'] }, { tags: 'python' }).should.equal(false);
        model.match({ tags: ['node', 'js', 'db'] }, { tagss: 'js' }).should.equal(false);
        model.match({ tags: ['node', 'js', 'db'] }, { tags: 'js' }).should.equal(true);
        model.match({ tags: ['node', 'js', 'db'] }, { tags: 'js', tags: 'node' }).should.equal(true);

        // Mixed matching with array and non array
        model.match({ tags: ['node', 'js', 'db'], nedb: true }, { tags: 'js', nedb: true }).should.equal(true);

        // Nested matching
        model.match({ number: 5, data: { tags: ['node', 'js', 'db'] } }, { "data.tags": 'js' }).should.equal(true);
        model.match({ number: 5, data: { tags: ['node', 'js', 'db'] } }, { "data.tags": 'j' }).should.equal(false);
      });

      it('Nested objects are deep-equality matched and not treated as sub-queries', function () {
        model.match({ a: { b: 5 } }, { a: { b: 5 } }).should.equal(true);
        model.match({ a: { b: 5, c: 3 } }, { a: { b: 5 } }).should.equal(false);

        model.match({ a: { b: 5 } }, { a: { b: { $lt: 10 } } }).should.equal(false);
        model.match({ a: { b: 5 } }, { a: { $or: { b: 10, b: 5 } } }).should.equal(false);
      });

    });


    describe('$lt', function () {

      it('Cannot compare a field to an object, an array, null or a boolean, it will return false', function () {
        model.match({ a: 5 }, { a: { $lt: { a: 6 } } }).should.equal(false);
        model.match({ a: 5 }, { a: { $lt: [6, 7] } }).should.equal(false);
        model.match({ a: 5 }, { a: { $lt: null } }).should.equal(false);
        model.match({ a: 5 }, { a: { $lt: true } }).should.equal(false);
      });

      it('Can compare numbers, with or without dot notation', function () {
        model.match({ a: 5 }, { a: { $lt: 6 } }).should.equal(true);
        model.match({ a: 5 }, { a: { $lt: 3 } }).should.equal(false);

        model.match({ a: { b: 5 } }, { "a.b": { $lt: 6 } }).should.equal(true);
        model.match({ a: { b: 5 } }, { "a.b": { $lt: 3 } }).should.equal(false);
      });

      it('Can compare strings, with or without dot notation', function () {
        model.match({ a: "nedb" }, { a: { $lt: "nedc" } }).should.equal(true);
        model.match({ a: "nedb" }, { a: { $lt: "neda" } }).should.equal(false);

        model.match({ a: { b: "nedb" } }, { "a.b": { $lt: "nedc" } }).should.equal(true);
        model.match({ a: { b: "nedb" } }, { "a.b": { $lt: "neda" } }).should.equal(false);
      });

      it('If field is an array field, a match means a match on at least one element', function () {
        model.match({ a: [5, 10] }, { a: { $lt: 4 } }).should.equal(false);
        model.match({ a: [5, 10] }, { a: { $lt: 6 } }).should.equal(true);
        model.match({ a: [5, 10] }, { a: { $lt: 11 } }).should.equal(true);
      });

    });


    describe('Logical operators $or, $and', function () {

      it('Any of the subqueries should match for an $or to match', function () {
        model.match({ hello: 'world' }, { $or: [ { hello: 'pluton' }, { hello: 'world' } ] }).should.equal(true);
        model.match({ hello: 'pluton' }, { $or: [ { hello: 'pluton' }, { hello: 'world' } ] }).should.equal(true);
        model.match({ hello: 'nope' }, { $or: [ { hello: 'pluton' }, { hello: 'world' } ] }).should.equal(false);
        model.match({ hello: 'world', age: 15 }, { $or: [ { hello: 'pluton' }, { age: { $lt: 20 } } ] }).should.equal(true);
        model.match({ hello: 'world', age: 15 }, { $or: [ { hello: 'pluton' }, { age: { $lt: 10 } } ] }).should.equal(false);
      });

      it('All of the subqueries should match for an $and to match', function () {
        model.match({ hello: 'world', age: 15 }, { $and: [ { age: 15 }, { hello: 'world' } ] }).should.equal(true);
        model.match({ hello: 'world', age: 15 }, { $and: [ { age: 16 }, { hello: 'world' } ] }).should.equal(false);
        model.match({ hello: 'world', age: 15 }, { $and: [ { hello: 'world' }, { age: { $lt: 20 } } ] }).should.equal(true);
        model.match({ hello: 'world', age: 15 }, { $and: [ { hello: 'pluton' }, { age: { $lt: 20 } } ] }).should.equal(false);
      });

      it('Logical operators are all top-level, only other logical operators can be above', function () {
        (function () { model.match({ a: { b: 7 } }, { a: { $or: [ { b: 5 }, { b: 7 } ] } })}).should.throw();
        model.match({ a: { b: 7 } }, { $or: [ { "a.b": 5 }, { "a.b": 7 } ] }).should.equal(true);
      });

      it('Logical operators can be combined as long as they are on top of the decision tree', function () {
        model.match({ a: 5, b: 7, c: 12 }, { $or: [ { $and: [ { a: 5 }, { b: 8 } ] }, { $and: [{ a: 5 }, { c : { $lt: 40 } }] } ] }).should.equal(true);
        model.match({ a: 5, b: 7, c: 12 }, { $or: [ { $and: [ { a: 5 }, { b: 8 } ] }, { $and: [{ a: 5 }, { c : { $lt: 10 } }] } ] }).should.equal(false);
      });

      it('Should throw an error if a logical operator is used without an array or if an unknown logical operator is used', function () {
        (function () { model.match({ a: 5 }, { $or: { a: 5, a: 6 } }); }).should.throw();
        (function () { model.match({ a: 5 }, { $and: { a: 5, a: 6 } }); }).should.throw();
        (function () { model.match({ a: 5 }, { $unknown: [ { a: 5 } ] }); }).should.throw();
      });

    });

  });   // ==== End of 'Finding documents' ==== //

});
