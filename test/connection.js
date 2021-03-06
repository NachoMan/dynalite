var request = require('./helpers').request

describe('dynalite connections', function() {

  describe('basic', function() {

    function assert404(done) {
      return function(err, res) {
        // Sometimes DynamoDB returns weird/bad HTTP responses
        if (err && err.code == 'HPE_INVALID_CONSTANT') return
        if (err) return done(err)
        // For some reason, sometimes this happens:
        if (res.statusCode == 200) {
          res.body.should.equal('<SCRIPT language=JavaScript>\n')
        } else {
          res.statusCode.should.equal(404)
          try {
            res.body.should.equal('<UnknownOperationException/>\n')
            res.headers['x-amz-crc32'].should.equal('3552371480')
            res.headers['content-length'].should.equal('29')
          } catch (e) {
            // Sometimes it's an HTML page instead of the above
            res.body.should.equal(
              '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" ' +
              '"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">\n' +
              '<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">\n' +
              '<head>\n  ' +
              '<title>Page Not Found</title>\n' +
              '</head>\n' +
              '<body>Page Not Found</body>\n' +
              '</html>'
            )
            res.headers['x-amz-crc32'].should.equal('2548615100')
            res.headers['content-length'].should.equal('272')
          }
        }
        res.headers['x-amzn-requestid'].length.should.equal(52)
        done()
      }
    }

    // Appears to currently be 8MB in us-east-1, us-west-1 and us-west-2 - not sure about others
    it.skip('should return 413 if request too large', function(done) {
      this.timeout(100000)
      var body = Array(8 * 1024 * 1024 + 1), i
      for (i = 0; i < body.length; i++)
        body[i] = 'a'

      request({body: body.join(''), noSign: true}, function(err, res) {
        if (err) return done(err)
        res.statusCode.should.equal(413)
        res.headers['transfer-encoding'].should.equal('chunked')
        done()
      })
    })

    it.skip('should not return 413 if request not too large', function(done) {
      this.timeout(100000)
      var body = Array(8 * 1024 * 1024), i
      for (i = 0; i < body.length; i++)
        body[i] = 'a'

      request({body: body.join(''), noSign: true}, function(err, res) {
        if (err && err.code == 'HPE_INVALID_CONSTANT') return
        if (err) return done(err)
        res.statusCode.should.equal(404)
        done()
      })
    })

    it('should return 404 if a GET', function(done) {
      request({method: 'GET', noSign: true}, assert404(done))
    })

    it('should return 404 if a PUT', function(done) {
      request({method: 'PUT', noSign: true}, assert404(done))
    })

    it('should return 404 if a DELETE', function(done) {
      request({method: 'DELETE', noSign: true}, assert404(done))
    })

    it('should return 404 if body but no content-type', function(done) {
      request({body: 'hi', noSign: true}, assert404(done))
    })

    it('should return 404 if body but incorrect content-type', function(done) {
      request({body: 'hi', headers: {'content-type': 'whatever'}, noSign: true}, assert404(done))
    })

  })

  describe('JSON', function() {

    function assertBody(body, crc32, contentType, done) {
      if (typeof contentType == 'function') { done = contentType; contentType = 'application/json' }
      return function(err, res) {
        if (err) return done(err)
        res.statusCode.should.equal(400)
        res.body.should.eql(body)
        res.headers['x-amzn-requestid'].length.should.equal(52)
        res.headers['x-amz-crc32'].should.equal(String(crc32))
        res.headers['content-type'].should.equal(contentType)
        res.headers['content-length'].should.equal(String(Buffer.byteLength(JSON.stringify(res.body), 'utf8')))
        done()
      }
    }

    function assertSerialization(contentType, done) {
      return assertBody({__type: 'com.amazon.coral.service#SerializationException'}, 3948637019,
                        contentType, done)
    }

    function assertUnknownOp(contentType, done) {
      return assertBody({__type: 'com.amazon.coral.service#UnknownOperationException'}, 1368724161,
                        contentType, done)
    }

    function assertMissing(contentType, done) {
      return assertBody({
        __type: 'com.amazon.coral.service#MissingAuthenticationTokenException',
        message: 'Request is missing Authentication Token',
      }, 2088342776, contentType, done)
    }

    function assertIncomplete(contentType, done) {
      return assertBody({
        __type: 'com.amazon.coral.service#IncompleteSignatureException',
        message: 'Authorization header requires \'Credential\' parameter. ' +
                 'Authorization header requires \'Signature\' parameter. ' +
                 'Authorization header requires \'SignedHeaders\' parameter. ' +
                 'Authorization header requires existence of either a \'X-Amz-Date\' or ' +
                 'a \'Date\' header. Authorization=AWS4-'
      }, 1828866742, contentType, done)
    }

    it('should return SerializationException if body is application/json but not JSON', function(done) {
      request({body: 'hi', headers: {'content-type': 'application/json'}, noSign: true},
              assertSerialization(done))
    })

    it('should return SerializationException if body is application/x-amz-json-1.0 but not JSON', function(done) {
      request({body: 'hi', headers: {'content-type': 'application/x-amz-json-1.0'}, noSign: true},
              assertSerialization('application/x-amz-json-1.0', done))
    })

    it('should return UnknownOperationException if no target', function(done) {
      request({noSign: true}, assertUnknownOp(done))
    })

    it('should return UnknownOperationException if body is application/json', function(done) {
      request({body: '{}', headers: {'content-type': 'application/json'}, noSign: true},
              assertUnknownOp(done))
    })

    it('should return UnknownOperationException if body is application/x-amz-json-1.0', function(done) {
      request({body: '{}', headers: {'content-type': 'application/x-amz-json-1.0'}, noSign: true},
              assertUnknownOp('application/x-amz-json-1.0', done))
    })

    it('should return UnknownOperationException if incorrect target', function(done) {
      request({headers: {'x-amz-target': 'whatever'}, noSign: true}, assertUnknownOp(done))
    })

    it('should return UnknownOperationException if incorrect target operation', function(done) {
      request({headers: {'x-amz-target': 'DynamoDB_20120810.ListTable'}, noSign: true}, assertUnknownOp(done))
    })

    it('should return MissingAuthenticationTokenException if no Authorization header', function(done) {
      request({headers: {'x-amz-target': 'DynamoDB_20120810.ListTables'}, noSign: true}, assertMissing(done))
    })

    it('should return MissingAuthenticationTokenException if incomplete Authorization header', function(done) {
      request({headers: {'x-amz-target': 'DynamoDB_20120810.ListTables', 'Authorization': 'AWS4'}, noSign: true},
              assertMissing(done))
    })

    it('should return IncompleteSignatureException if Authorization header is "AWS4-"', function(done) {
      request({headers: {'x-amz-target': 'DynamoDB_20120810.ListTables', 'Authorization': 'AWS4-'}, noSign: true},
              assertIncomplete(done))
    })

  })

})
