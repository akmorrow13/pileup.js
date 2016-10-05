/** @flow */
'use strict';

import {expect} from 'chai';

import sinon from 'sinon';

import ContigInterval from '../../main/ContigInterval';
import GA4GHDataSource from '../../main/sources/GA4GHDataSource';
import RemoteFile from '../../main/RemoteFile';

describe('GA4GHDataSource', function() {
  var server: any = null, response;

  before(function () {
    return new RemoteFile('/test-data/chr17.1-250.json').getAllString().then(data => {
      response = data;
      server = sinon.fakeServer.create();  // _after_ we do a real XHR!
    });
  });

  after(function () {
    server.restore();
  });

  it('should fetch alignments from a server', function(done) {
    // ALYSSA: TODO: should move back to POST as in original API
    server.respondWith('GET', '/v0.5.1/reads/search/chr17?start=1&end=1000',
                       [200, { "Content-Type": "application/json" }, response]);

    var source = GA4GHDataSource.create({
      endpoint: '/v0.5.1/reads',
      readGroupId: 'search',
      killChr: false
    });

    var requestInterval = new ContigInterval('chr17', 10, 20);
    expect(source.getAlignmentsInRange(requestInterval))
        .to.deep.equal([]);

    var progress = [];
    source.on('networkprogress', e => { progress.push(e); });
    source.on('networkdone', e => { progress.push('done'); });
    source.on('newdata', () => {
      var reads = source.getAlignmentsInRange(requestInterval);
      expect(reads).to.have.length(1);
      done();
    });

    source.rangeChanged({contig: 'chr17', start: 1, stop: 30});
    server.respond();
  });

});
