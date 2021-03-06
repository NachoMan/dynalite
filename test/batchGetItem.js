var helpers = require('./helpers')

var target = 'BatchGetItem',
    request = helpers.request,
    randomName = helpers.randomName,
    opts = helpers.opts.bind(null, target),
    assertType = helpers.assertType.bind(null, target),
    assertValidation = helpers.assertValidation.bind(null, target),
    assertNotFound = helpers.assertNotFound.bind(null, target)

describe('batchGetItem', function() {

  describe('serializations', function() {

    it('should return SerializationException when RequestItems is not a map', function(done) {
      assertType('RequestItems', 'Map', done)
    })

    it('should return SerializationException when RequestItems.Attr is not a struct', function(done) {
      assertType('RequestItems.Attr', 'Structure', done)
    })

    it('should return SerializationException when RequestItems.Attr.Keys is not a list', function(done) {
      assertType('RequestItems.Attr.Keys', 'List', done)
    })

    it('should return SerializationException when RequestItems.Attr.Keys.0 is not a map', function(done) {
      assertType('RequestItems.Attr.Keys.0', 'Map', done)
    })

    it('should return SerializationException when RequestItems.Attr.Keys.0.Attr is not a struct', function(done) {
      assertType('RequestItems.Attr.Keys.0.Attr', 'Structure', done)
    })

    it('should return SerializationException when RequestItems.Attr.Keys.0.Attr.S is not a string', function(done) {
      assertType('RequestItems.Attr.Keys.0.Attr.S', 'String', done)
    })

    it('should return SerializationException when RequestItems.Attr.Keys.0.Attr.B is not a blob', function(done) {
      assertType('RequestItems.Attr.Keys.0.Attr.B', 'Blob', done)
    })

    it('should return SerializationException when RequestItems.Attr.Keys.0.Attr.N is not a string', function(done) {
      assertType('RequestItems.Attr.Keys.0.Attr.N', 'String', done)
    })

    it('should return SerializationException when RequestItems.Attr.AttributesToGet is not a list', function(done) {
      assertType('RequestItems.Attr.AttributesToGet', 'List', done)
    })

    it('should return SerializationException when RequestItems.Attr.ConsistentRead is not a boolean', function(done) {
      assertType('RequestItems.Attr.ConsistentRead', 'Boolean', done)
    })

    it('should return SerializationException when ReturnConsumedCapacity is not a string', function(done) {
      assertType('ReturnConsumedCapacity', 'String', done)
    })

  })

  describe('validations', function() {

    it('should return ValidationException for empty RequestItems', function(done) {
      assertValidation({},
        '1 validation error detected: ' +
        'Value null at \'requestItems\' failed to satisfy constraint: ' +
        'Member must not be null', done)
    })

    it('should return ValidationException for missing RequestItems', function(done) {
      assertValidation({ReturnConsumedCapacity: 'hi', ReturnItemCollectionMetrics: 'hi'},
        '2 validation errors detected: ' +
        'Value \'hi\' at \'returnConsumedCapacity\' failed to satisfy constraint: ' +
        'Member must satisfy enum value set: [INDEXES, TOTAL, NONE]; ' +
        'Value null at \'requestItems\' failed to satisfy constraint: ' +
        'Member must not be null', done)
    })

    it('should return ValidationException for empty RequestItems', function(done) {
      assertValidation({RequestItems: {}},
        '1 validation error detected: ' +
        'Value \'{}\' at \'requestItems\' failed to satisfy constraint: ' +
        'Member must have length greater than or equal to 1', done)
    })

    it('should return ValidationException for short table name with no keys', function(done) {
      assertValidation({RequestItems: {a: {}}, ReturnConsumedCapacity: 'hi', ReturnItemCollectionMetrics: 'hi'},
        '2 validation errors detected: ' +
        'Value \'hi\' at \'returnConsumedCapacity\' failed to satisfy constraint: ' +
        'Member must satisfy enum value set: [INDEXES, TOTAL, NONE]; ' +
        'Value null at \'requestItems.a.member.keys\' failed to satisfy constraint: ' +
        'Member must not be null', done)
    })

    it('should return ValidationException for empty keys', function(done) {
      assertValidation({RequestItems: {a: {Keys: []}}},
        '1 validation error detected: ' +
        'Value \'[]\' at \'requestItems.a.member.keys\' failed to satisfy constraint: ' +
        'Member must have length greater than or equal to 1', done)
    })

    it('should return ValidationException for incorrect attributes', function(done) {
      assertValidation({RequestItems: {'aa;': {}}, ReturnConsumedCapacity: 'hi'},
        '2 validation errors detected: ' +
        'Value \'hi\' at \'returnConsumedCapacity\' failed to satisfy constraint: ' +
        'Member must satisfy enum value set: [INDEXES, TOTAL, NONE]; ' +
        'Value null at \'requestItems.aa;.member.keys\' failed to satisfy constraint: ' +
        'Member must not be null', done)
    })

    it('should return ValidationException when fetching more than 100 keys', function(done) {
      var keys = [], i
      for (i = 0; i < 101; i++) {
        keys.push({a: {S: String(i)}})
      }
      assertValidation({RequestItems: {abc: {Keys: keys}}},
        /^1 validation error detected: Value '.*' at 'requestItems.abc.member.keys' failed to satisfy constraint: Member must have length less than or equal to 100$/, done)
    })

    it('should return ValidationException when fetching more than 100 keys over multiple tables', function(done) {
      var keys = [], i
      for (i = 0; i < 100; i++) {
        keys.push({a: {S: String(i)}})
      }
      assertValidation({RequestItems: {abc: {Keys: keys}, abd: {Keys: [{a: {S: '100'}}]}}},
        'Too many items requested for the BatchGetItem call', done)
    })

    it('should return ResourceNotFoundException when fetching exactly 100 keys and table does not exist', function(done) {
      var keys = [], i
      for (i = 0; i < 100; i++) {
        keys.push({a: {S: String(i)}})
      }
      assertNotFound({RequestItems: {abc: {Keys: keys}}},
        'Requested resource not found', done)
    })

    it('should return ValidationException for duplicated keys', function(done) {
      var key = {a: {S: helpers.randomString()}},
          batchReq = {RequestItems: {}}
      batchReq.RequestItems[helpers.testHashTable] = {Keys: [key, key, key]}
      assertValidation(batchReq, 'Provided list of item keys contains duplicates', done)
    })

    it('should return ValidationException for duplicated mixed up keys', function(done) {
      var key = {a: {S: helpers.randomString()}},
          key2 = {a: {S: helpers.randomString()}},
          batchReq = {RequestItems: {}}
      batchReq.RequestItems[helpers.testHashTable] = {Keys: [key, key2, key]}
      assertValidation(batchReq, 'Provided list of item keys contains duplicates', done)
    })

    it('should return ResourceNotFoundException for short table name with keys', function(done) {
      assertNotFound({RequestItems: {a: {Keys: [{a: {S: 'a'}}]}}}, 'Requested resource not found', done)
    })

    it('should return ValidationException for empty key type', function(done) {
      assertValidation({RequestItems: {abc: {Keys: [{a: {}}]}}},
        'Supplied AttributeValue is empty, must contain exactly one of the supported datatypes', done)
    })

    it('should return ValidationException for bad key type', function(done) {
      assertValidation({RequestItems: {abc: {Keys: [{a: {a: ''}}]}}},
        'Supplied AttributeValue is empty, must contain exactly one of the supported datatypes', done)
    })

    it('should return ValidationException for empty string', function(done) {
      assertValidation({RequestItems: {abc: {Keys: [{a: {S: ''}}]}}},
        'One or more parameter values were invalid: An AttributeValue may not contain an empty string.', done)
    })

    it('should return ValidationException for empty binary', function(done) {
      assertValidation({RequestItems: {abc: {Keys: [{a: {B: ''}}]}}},
        'One or more parameter values were invalid: An AttributeValue may not contain a null or empty binary type.', done)
    })

    // Somehow allows set types for keys
    it('should return ValidationException for empty set key', function(done) {
      assertValidation({RequestItems: {abc: {Keys: [{a: {SS: []}}]}}},
        'One or more parameter values were invalid: An string set  may not be empty', done)
    })

    it('should return ValidationException for empty string in set', function(done) {
      assertValidation({RequestItems: {abc: {Keys: [{a: {SS: ['a', '']}}]}}},
        'One or more parameter values were invalid: An string set may not have a empty string as a member', done)
    })

    it('should return ValidationException for empty binary in set', function(done) {
      assertValidation({RequestItems: {abc: {Keys: [{a: {BS: ['aaaa', '']}}]}}},
        'One or more parameter values were invalid: Binary sets may not contain null or empty values', done)
    })

    it('should return ValidationException if key has empty numeric in set', function(done) {
      assertValidation({RequestItems: {abc: {Keys: [{a: {NS: ['1', '']}}]}}},
        'The parameter cannot be converted to a numeric value', done)
    })

    it('should return ValidationException for duplicate string in set', function(done) {
      assertValidation({RequestItems: {abc: {Keys: [{a: {SS: ['a', 'a']}}]}}},
        'One or more parameter values were invalid: Input collection [a, a] contains duplicates.', done)
    })

    it('should return ValidationException for duplicate number in set', function(done) {
      assertValidation({RequestItems: {abc: {Keys: [{a: {NS: ['1', '1']}}]}}},
        'Input collection contains duplicates', done)
    })

    it('should return ValidationException for duplicate binary in set', function(done) {
      assertValidation({RequestItems: {abc: {Keys: [{a: {BS: ['Yg==', 'Yg==']}}]}}},
        'One or more parameter values were invalid: Input collection [Yg==, Yg==]of type BS contains duplicates.', done)
    })

    it('should return ValidationException for multiple types', function(done) {
      assertValidation({RequestItems: {abc: {Keys: [{a: {S: 'a', N: '1'}}]}}},
        'Supplied AttributeValue has more than one datatypes set, must contain exactly one of the supported datatypes', done)
    })

    it('should return ValidationException if key has empty numeric type', function(done) {
      assertValidation({RequestItems: {abc: {Keys: [{a: {N: ''}}]}}},
        'The parameter cannot be converted to a numeric value', done)
    })

    it('should return ValidationException if key has incorrect numeric type', function(done) {
      assertValidation({RequestItems: {abc: {Keys: [{a: {N: 'b'}}]}}},
        'The parameter cannot be converted to a numeric value: b', done)
    })

    it('should return ValidationException if key has large numeric type', function(done) {
      assertValidation({RequestItems: {abc: {Keys: [{a: {N: '123456789012345678901234567890123456789'}}]}}},
        'Attempting to store more than 38 significant digits in a Number', done)
    })

    it('should return ValidationException if key has long digited number', function(done) {
      assertValidation({RequestItems: {abc: {Keys: [{a: {N: '-1.23456789012345678901234567890123456789'}}]}}},
        'Attempting to store more than 38 significant digits in a Number', done)
    })

    it('should return ValidationException if key has huge positive number', function(done) {
      assertValidation({RequestItems: {abc: {Keys: [{a: {N: '1e126'}}]}}},
        'Number overflow. Attempting to store a number with magnitude larger than supported range', done)
    })

    it('should return ValidationException if key has huge negative number', function(done) {
      assertValidation({RequestItems: {abc: {Keys: [{a: {N: '-1e126'}}]}}},
        'Number overflow. Attempting to store a number with magnitude larger than supported range', done)
    })

    it('should return ValidationException if key has tiny positive number', function(done) {
      assertValidation({RequestItems: {abc: {Keys: [{a: {N: '1e-131'}}]}}},
        'Number underflow. Attempting to store a number with magnitude smaller than supported range', done)
    })

    it('should return ValidationException if key has tiny negative number', function(done) {
      assertValidation({RequestItems: {abc: {Keys: [{a: {N: '-1e-131'}}]}}},
        'Number underflow. Attempting to store a number with magnitude smaller than supported range', done)
    })

     it('should return ValidationException if key has incorrect numeric type in set', function(done) {
      assertValidation({RequestItems: {abc: {Keys: [{a: {NS: ['1', 'b', 'a']}}]}}},
        'The parameter cannot be converted to a numeric value: b', done)
    })

    it('should return ValidationException duplicate values in AttributesToGet', function(done) {
      assertValidation({RequestItems: {abc: {Keys: [{}], AttributesToGet: ['a', 'a']}}},
        'One or more parameter values were invalid: Duplicate value in attribute name: a', done)
    })

    it('should return ResourceNotFoundException if key is empty and table does not exist', function(done) {
      var batchReq = {RequestItems: {}}
      batchReq.RequestItems[randomName()] = {Keys: [{}]}
      assertNotFound(batchReq,
        'Requested resource not found', done)
    })

    it('should return ValidationException if key is empty and table does exist', function(done) {
      var batchReq = {RequestItems: {}}
      batchReq.RequestItems[helpers.testHashTable] = {Keys: [{}]}
      assertValidation(batchReq,
        'The provided key element does not match the schema', done)
    })

    it('should return ValidationException if key has incorrect attributes', function(done) {
      var batchReq = {RequestItems: {}}
      batchReq.RequestItems[helpers.testHashTable] = {Keys: [{b: {S: 'a'}}]}
      assertValidation(batchReq,
        'The provided key element does not match the schema', done)
    })

    it('should return ValidationException if key has extra attributes', function(done) {
      var batchReq = {RequestItems: {}}
      batchReq.RequestItems[helpers.testHashTable] = {Keys: [{a: {S: 'a'}, b: {S: 'a'}}]}
      assertValidation(batchReq,
        'The provided key element does not match the schema', done)
    })

    it('should return ValidationException if key is incorrect binary type', function(done) {
      var batchReq = {RequestItems: {}}
      batchReq.RequestItems[helpers.testHashTable] = {Keys: [{a: {B: 'abcd'}}]}
      assertValidation(batchReq,
        'The provided key element does not match the schema', done)
    })

    it('should return ValidationException if key is incorrect numeric type', function(done) {
      var batchReq = {RequestItems: {}}
      batchReq.RequestItems[helpers.testHashTable] = {Keys: [{a: {N: '1'}}]}
      assertValidation(batchReq,
        'The provided key element does not match the schema', done)
    })

    it('should return ValidationException if key is incorrect string set type', function(done) {
      var batchReq = {RequestItems: {}}
      batchReq.RequestItems[helpers.testHashTable] = {Keys: [{a: {SS: ['a']}}]}
      assertValidation(batchReq,
        'The provided key element does not match the schema', done)
    })

    it('should return ValidationException if key is incorrect numeric set type', function(done) {
      var batchReq = {RequestItems: {}}
      batchReq.RequestItems[helpers.testHashTable] = {Keys: [{a: {NS: ['1']}}]}
      assertValidation(batchReq,
        'The provided key element does not match the schema', done)
    })

    it('should return ValidationException if key is incorrect binary set type', function(done) {
      var batchReq = {RequestItems: {}}
      batchReq.RequestItems[helpers.testHashTable] = {Keys: [{a: {BS: ['aaaa']}}]}
      assertValidation(batchReq,
        'The provided key element does not match the schema', done)
    })

    it('should return ValidationException if missing range key', function(done) {
      var batchReq = {RequestItems: {}}
      batchReq.RequestItems[helpers.testRangeTable] = {Keys: [{a: {S: 'a'}}]}
      assertValidation(batchReq,
        'The provided key element does not match the schema', done)
    })

    it('should return ValidationException if hash key is too big', function(done) {
      var batchReq = {RequestItems: {}}, keyStr = (helpers.randomString() + new Array(2048).join('a')).slice(0, 2049)
      batchReq.RequestItems[helpers.testHashTable] = {Keys: [{a: {S: keyStr}}]}
      assertValidation(batchReq,
        'One or more parameter values were invalid: ' +
        'Size of hashkey has exceeded the maximum size limit of2048 bytes', done)
    })

    it('should return ValidationException if range key is too big', function(done) {
      var batchReq = {RequestItems: {}}, keyStr = (helpers.randomString() + new Array(1024).join('a')).slice(0, 1025)
      batchReq.RequestItems[helpers.testRangeTable] = {Keys: [{a: {S: 'a'}, b: {S: keyStr}}]}
      assertValidation(batchReq,
        'One or more parameter values were invalid: ' +
        'Aggregated size of all range keys has exceeded the size limit of 1024 bytes', done)
    })

    it('should return ResourceNotFoundException if table is being created', function(done) {
      var table = {
        TableName: randomName(),
        AttributeDefinitions: [{AttributeName: 'a', AttributeType: 'S'}],
        KeySchema: [{KeyType: 'HASH', AttributeName: 'a'}],
        ProvisionedThroughput: {ReadCapacityUnits: 1, WriteCapacityUnits: 1},
      }
      request(helpers.opts('CreateTable', table), function(err) {
        if (err) return done(err)
        var batchReq = {RequestItems: {}}
        batchReq.RequestItems[table.TableName] = {Keys: [{a: {S: 'a'}}]}
        assertNotFound(batchReq,
          'Requested resource not found', done)
      })
    })

  })

  describe('functionality', function() {

    it('should return empty responses if keys do not exist', function(done) {
      var batchReq = {RequestItems: {}}
      batchReq.RequestItems[helpers.testHashTable] = {Keys: [{a: {S: helpers.randomString()}}]}
      batchReq.RequestItems[helpers.testRangeTable] = {Keys: [{a: {S: helpers.randomString()}, b: {S: helpers.randomString()}}]}
      request(opts(batchReq), function(err, res) {
        if (err) return done(err)
        res.statusCode.should.equal(200)
        res.body.Responses[helpers.testHashTable].should.eql([])
        res.body.Responses[helpers.testRangeTable].should.eql([])
        res.body.UnprocessedKeys.should.eql({})
        done()
      })
    })

    it('should return only items that do exist', function(done) {
      var item = {a: {S: helpers.randomString()}, b: {N: helpers.randomString()}},
          item2 = {a: {S: helpers.randomString()}, b: item.b},
          item3 = {a: {S: helpers.randomString()}, b: {N: helpers.randomString()}},
          batchReq = {RequestItems: {}}
      batchReq.RequestItems[helpers.testHashTable] = [
        {PutRequest: {Item: item}},
        {PutRequest: {Item: item2}},
        {PutRequest: {Item: item3}},
      ]
      request(helpers.opts('BatchWriteItem', batchReq), function(err, res) {
        if (err) return done(err)
        res.statusCode.should.equal(200)
        batchReq = {RequestItems: {}}
        batchReq.RequestItems[helpers.testHashTable] = {Keys: [
          {a: item.a},
          {a: {S: helpers.randomString()}},
          {a: item3.a},
          {a: {S: helpers.randomString()}},
        ], ConsistentRead: true}
        request(opts(batchReq), function(err, res) {
          if (err) return done(err)
          res.statusCode.should.equal(200)
          res.body.Responses[helpers.testHashTable].should.includeEql(item)
          res.body.Responses[helpers.testHashTable].should.includeEql(item3)
          res.body.Responses[helpers.testHashTable].should.have.length(2)
          res.body.UnprocessedKeys.should.eql({})
          done()
        })
      })
    })

    it('should return only requested attributes of items that do exist', function(done) {
      var item = {a: {S: helpers.randomString()}, b: {N: helpers.randomString()}, c: {S: 'c'}},
          item2 = {a: {S: helpers.randomString()}, b: item.b},
          item3 = {a: {S: helpers.randomString()}, b: {N: helpers.randomString()}},
          item4 = {a: {S: helpers.randomString()}},
          batchReq = {RequestItems: {}}
      batchReq.RequestItems[helpers.testHashTable] = [
        {PutRequest: {Item: item}},
        {PutRequest: {Item: item2}},
        {PutRequest: {Item: item3}},
        {PutRequest: {Item: item4}},
      ]
      request(helpers.opts('BatchWriteItem', batchReq), function(err, res) {
        if (err) return done(err)
        res.statusCode.should.equal(200)
        batchReq = {RequestItems: {}}
        batchReq.RequestItems[helpers.testHashTable] = {Keys: [
          {a: item.a},
          {a: {S: helpers.randomString()}},
          {a: item3.a},
          {a: {S: helpers.randomString()}},
          {a: item4.a},
        ], AttributesToGet: ['b', 'c'], ConsistentRead: true}
        request(opts(batchReq), function(err, res) {
          if (err) return done(err)
          res.statusCode.should.equal(200)
          res.body.Responses[helpers.testHashTable].should.includeEql({b: item.b, c: item.c})
          res.body.Responses[helpers.testHashTable].should.includeEql({b: item3.b})
          res.body.Responses[helpers.testHashTable].should.includeEql({})
          res.body.Responses[helpers.testHashTable].should.have.length(3)
          res.body.UnprocessedKeys.should.eql({})
          done()
        })
      })
    })

    it('should return ConsumedCapacity from each specified table with no consistent read and small item', function(done) {
      var a = helpers.randomString(), b = new Array(4082 - a.length).join('b'),
          item = {a: {S: a}, b: {S: b}, c: {N: '12.3456'}, d: {B: 'AQI='}, e: {BS: ['AQI=', 'Ag==', 'AQ==']}},
          item2 = {a: {S: helpers.randomString()}},
          batchReq = {RequestItems: {}}
      batchReq.RequestItems[helpers.testHashTable] = [{PutRequest: {Item: item}}, {PutRequest: {Item: item2}}]
      request(helpers.opts('BatchWriteItem', batchReq), function(err, res) {
        if (err) return done(err)
        res.statusCode.should.equal(200)
        batchReq = {RequestItems: {}, ReturnConsumedCapacity: 'TOTAL'}
        batchReq.RequestItems[helpers.testHashTable] = {Keys: [{a: item.a}, {a: item2.a}, {a: {S: helpers.randomString()}}]}
        batchReq.RequestItems[helpers.testHashNTable] = {Keys: [{a: {N: helpers.randomString()}}]}
        request(opts(batchReq), function(err, res) {
          if (err) return done(err)
          res.statusCode.should.equal(200)
          res.body.ConsumedCapacity.should.includeEql({CapacityUnits: 1.5, TableName: helpers.testHashTable})
          res.body.ConsumedCapacity.should.includeEql({CapacityUnits: 0.5, TableName: helpers.testHashNTable})
          res.body.Responses[helpers.testHashTable].should.have.length(2)
          res.body.Responses[helpers.testHashNTable].should.have.length(0)
          done()
        })
      })
    })

    it('should return ConsumedCapacity from each specified table with no consistent read and larger item', function(done) {
      var a = helpers.randomString(), b = new Array(4084 - a.length).join('b'),
          item = {a: {S: a}, b: {S: b}, c: {N: '12.3456'}, d: {B: 'AQI='}, e: {BS: ['AQI=', 'Ag==']}},
          item2 = {a: {S: helpers.randomString()}},
          batchReq = {RequestItems: {}}
      batchReq.RequestItems[helpers.testHashTable] = [{PutRequest: {Item: item}}, {PutRequest: {Item: item2}}]
      request(helpers.opts('BatchWriteItem', batchReq), function(err, res) {
        if (err) return done(err)
        res.statusCode.should.equal(200)
        batchReq = {RequestItems: {}, ReturnConsumedCapacity: 'TOTAL'}
        batchReq.RequestItems[helpers.testHashTable] = {Keys: [{a: item.a}, {a: item2.a}, {a: {S: helpers.randomString()}}]}
        batchReq.RequestItems[helpers.testHashNTable] = {Keys: [{a: {N: helpers.randomString()}}]}
        request(opts(batchReq), function(err, res) {
          if (err) return done(err)
          res.statusCode.should.equal(200)
          res.body.ConsumedCapacity.should.includeEql({CapacityUnits: 2, TableName: helpers.testHashTable})
          res.body.ConsumedCapacity.should.includeEql({CapacityUnits: 0.5, TableName: helpers.testHashNTable})
          res.body.Responses[helpers.testHashTable].should.have.length(2)
          res.body.Responses[helpers.testHashNTable].should.have.length(0)
          done()
        })
      })
    })

    it('should return ConsumedCapacity from each specified table with consistent read and small item', function(done) {
      var a = helpers.randomString(), b = new Array(4082 - a.length).join('b'),
          item = {a: {S: a}, b: {S: b}, c: {N: '12.3456'}, d: {B: 'AQI='}, e: {BS: ['AQI=', 'Ag==', 'AQ==']}},
          item2 = {a: {S: helpers.randomString()}},
          batchReq = {RequestItems: {}}
      batchReq.RequestItems[helpers.testHashTable] = [{PutRequest: {Item: item}}, {PutRequest: {Item: item2}}]
      request(helpers.opts('BatchWriteItem', batchReq), function(err, res) {
        if (err) return done(err)
        res.statusCode.should.equal(200)
        batchReq = {RequestItems: {}, ReturnConsumedCapacity: 'TOTAL'}
        batchReq.RequestItems[helpers.testHashTable] = {Keys: [{a: item.a}, {a: item2.a}, {a: {S: helpers.randomString()}}], ConsistentRead: true}
        batchReq.RequestItems[helpers.testHashNTable] = {Keys: [{a: {N: helpers.randomString()}}], ConsistentRead: true}
        request(opts(batchReq), function(err, res) {
          if (err) return done(err)
          res.statusCode.should.equal(200)
          res.body.ConsumedCapacity.should.includeEql({CapacityUnits: 3, TableName: helpers.testHashTable})
          res.body.ConsumedCapacity.should.includeEql({CapacityUnits: 1, TableName: helpers.testHashNTable})
          res.body.Responses[helpers.testHashTable].should.have.length(2)
          res.body.Responses[helpers.testHashNTable].should.have.length(0)
          done()
        })
      })
    })

    it('should return ConsumedCapacity from each specified table with consistent read and larger item', function(done) {
      var a = helpers.randomString(), b = new Array(4084 - a.length).join('b'),
          item = {a: {S: a}, b: {S: b}, c: {N: '12.3456'}, d: {B: 'AQI='}, e: {BS: ['AQI=', 'Ag==']}},
          item2 = {a: {S: helpers.randomString()}},
          batchReq = {RequestItems: {}}
      batchReq.RequestItems[helpers.testHashTable] = [{PutRequest: {Item: item}}, {PutRequest: {Item: item2}}]
      request(helpers.opts('BatchWriteItem', batchReq), function(err, res) {
        if (err) return done(err)
        res.statusCode.should.equal(200)
        batchReq = {RequestItems: {}, ReturnConsumedCapacity: 'TOTAL'}
        batchReq.RequestItems[helpers.testHashTable] = {Keys: [{a: item.a}, {a: item2.a}, {a: {S: helpers.randomString()}}], ConsistentRead: true}
        batchReq.RequestItems[helpers.testHashNTable] = {Keys: [{a: {N: helpers.randomString()}}], ConsistentRead: true}
        request(opts(batchReq), function(err, res) {
          if (err) return done(err)
          res.statusCode.should.equal(200)
          res.body.ConsumedCapacity.should.includeEql({CapacityUnits: 4, TableName: helpers.testHashTable})
          res.body.ConsumedCapacity.should.includeEql({CapacityUnits: 1, TableName: helpers.testHashNTable})
          res.body.Responses[helpers.testHashTable].should.have.length(2)
          res.body.Responses[helpers.testHashNTable].should.have.length(0)
          done()
        })
      })
    })

    // TODO: Need high capacity to run this
    it.skip('should return all items if just under limit', function(done) {
      this.timeout(100000)

      var i, item, items = [], b = new Array(65530).join('b'),
          batchReq = {RequestItems: {}, ReturnConsumedCapacity: 'TOTAL'}
      for (i = 0; i < 17; i++) {
        if (i < 16) {
          item = {a: {S: ('0' + i).slice(-2)}, b: {S: b}}
        } else {
          item = {a: {S: ('0' + i).slice(-2)}, b: {S: b.slice(0, 17)}, c: {N: '12.3456'}, d: {B: 'AQI='},
            e: {SS: ['a', 'bc']}, f: {NS: ['1.23', '12.3']}, g: {BS: ['AQI=', 'Ag==', 'AQ==']}}
        }
        items.push(item)
      }
      helpers.batchWriteUntilDone(helpers.testHashTable, {puts: items}, function(err) {
        if (err) return done(err)
        batchReq.RequestItems[helpers.testHashTable] = {Keys: items.map(function(item) { return {a: item.a} }), ConsistentRead: true}
        request(opts(batchReq), function(err, res) {
          if (err) return done(err)
          res.statusCode.should.equal(200)
          res.body.UnprocessedKeys.should.eql({})
          res.body.Responses[helpers.testHashTable].should.have.length(17)
          res.body.ConsumedCapacity.should.eql([{CapacityUnits: 257, TableName: helpers.testHashTable}])
          done()
        })
      })
    })

    // TODO: Need high capacity to run this
    it.skip('should return an unprocessed item if just over limit', function(done) {
      this.timeout(100000)

      var i, item, items = [], b = new Array(65530).join('b'),
          batchReq = {RequestItems: {}, ReturnConsumedCapacity: 'TOTAL'}
      for (i = 0; i < 17; i++) {
        if (i < 16) {
          item = {a: {S: ('0' + i).slice(-2)}, b: {S: b}}
        } else {
          item = {a: {S: ('0' + i).slice(-2)}, b: {S: b.slice(0, 18)}, c: {N: '12.3456'}, d: {B: 'AQI='},
            e: {SS: ['a', 'bc']}, f: {NS: ['1.23', '12.3']}, g: {BS: ['AQI=', 'Ag==', 'AQ==']}}
        }
        items.push(item)
      }
      helpers.batchWriteUntilDone(helpers.testHashTable, {puts: items}, function(err) {
        if (err) return done(err)
        batchReq.RequestItems[helpers.testHashTable] = {Keys: items.map(function(item) { return {a: item.a} }), ConsistentRead: true}
        request(opts(batchReq), function(err, res) {
          if (err) return done(err)
          res.statusCode.should.equal(200)
          res.body.UnprocessedKeys[helpers.testHashTable].ConsistentRead.should.equal(true)
          res.body.UnprocessedKeys[helpers.testHashTable].Keys.should.have.length(1)
          Object.keys(res.body.UnprocessedKeys[helpers.testHashTable].Keys[0]).should.have.length(1)
          if (res.body.UnprocessedKeys[helpers.testHashTable].Keys[0].a.S == '16') {
            res.body.ConsumedCapacity.should.eql([{CapacityUnits: 256, TableName: helpers.testHashTable}])
          } else {
            res.body.UnprocessedKeys[helpers.testHashTable].Keys[0].a.S.should.be.above(-1)
            res.body.UnprocessedKeys[helpers.testHashTable].Keys[0].a.S.should.be.below(17)
            res.body.ConsumedCapacity.should.eql([{CapacityUnits: 241, TableName: helpers.testHashTable}])
          }
          res.body.Responses[helpers.testHashTable].should.have.length(16)
          done()
        })
      })
    })


    // TODO: Need high capacity to run this
    it.skip('should return many unprocessed items if very over the limit', function(done) {
      this.timeout(100000)

      var i, item, items = [], b = new Array(65533).join('b'),
          batchReq = {RequestItems: {}, ReturnConsumedCapacity: 'TOTAL'}
      for (i = 0; i < 20; i++) {
        if (i < 16) {
          item = {a: {S: ('0' + i).slice(-2)}, b: {S: b}}
        } else {
          item = {a: {S: ('0' + i).slice(-2)}, b: {S: b.slice(0, 18)}}
        }
        items.push(item)
      }
      helpers.batchBulkPut(helpers.testHashTable, items, function(err) {
        if (err) return done(err)
        batchReq.RequestItems[helpers.testHashTable] = {Keys: items.map(function(item) { return {a: item.a} }), ConsistentRead: true}
        request(opts(batchReq), function(err, res) {
          if (err) return done(err)
          res.statusCode.should.equal(200)
          res.body.UnprocessedKeys[helpers.testHashTable].ConsistentRead.should.equal(true)
          res.body.UnprocessedKeys[helpers.testHashTable].Keys.length.should.be.above(0)
          res.body.Responses[helpers.testHashTable].length.should.be.above(0)

          var totalLength, i, totalCapacity

          totalLength = res.body.Responses[helpers.testHashTable].length +
            res.body.UnprocessedKeys[helpers.testHashTable].Keys.length
          totalLength.should.equal(20)

          totalCapacity = res.body.ConsumedCapacity[0].CapacityUnits
          for (i = 0; i < res.body.UnprocessedKeys[helpers.testHashTable].Keys.length; i++)
            totalCapacity += res.body.UnprocessedKeys[helpers.testHashTable].Keys[i].a.S < 16 ? 16 : 1
          totalCapacity.should.equal(340)

          done()
        })
      })
    })

  })

})


