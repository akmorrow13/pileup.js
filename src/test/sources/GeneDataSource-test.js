/* @flow */
'use strict';

import {expect} from 'chai';

import sinon from 'sinon';

import ContigInterval from '../../main/ContigInterval';
import RemoteFile from '../../main/RemoteFile';
import GeneDataSource from '../../main/sources/GeneDataSource';

describe('GeneDataSource', function() {
  var server: any = null, response;

  before(function () {
    return new RemoteFile('/test-data/genes-chrM-0-30000.json').getAllString().then(data => {
      response = data;
      server = sinon.fakeServer.create();
      server.respondWith('GET', '/genes/chrM?start=1&end=100000&key=test', [200, { "Content-Type": "application/json" }, response]);
    });
  });

  after(function () {
    server.restore();
  });

  function getTestSource() {
    var source = GeneDataSource.create({
        url: '/genes',
        key: 'test'
    });
    return source;
  }

  it('should extract genes in a range', function(done) {
    var source = getTestSource();

    // No genes fetched initially
    var range = new ContigInterval('chrM', 0, 100000);
    var emptyGenes = source.getGenesInRange(range);
    expect(emptyGenes).to.deep.equal([]);

    // Fetching that one gene should cache its entire block.
    source.on('newdata', () => {
      var genes = source.getGenesInRange(range);
      console.log(genes);

      expect(genes).to.have.length(9);
      done();
    });
    source.rangeChanged({
      contig: range.contig,
      start: range.start(),
      stop: range.stop()
    });
    server.respond();
  });
});
