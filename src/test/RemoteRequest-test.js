/** @flow */
'use strict';

import {expect} from 'chai';

import sinon from 'sinon';

import {RemoteRequest} from '../main/RemoteRequest';
import RemoteFile from '../main/RemoteFile';
import ContigInterval from '../main/ContigInterval';

describe('RemoteRequest', function() {
  var server: any = null, response;
  var url = '/test';
  var contig = 'chr17';
  var start = 10;
  var stop = 20;
  var interval = new ContigInterval(contig, start, stop);
  var basePairsPerFetch = 1000;

  before(function () {
    return new RemoteFile('/test-data/chr17.1-250.json').getAllString().then(data => {
      response = data;
      server = sinon.fakeServer.create();
      var endpoint = '/test/chr17?start=10&end=20';
      server.respondWith('GET', endpoint,
                         [200, { "Content-Type": "application/json" }, response]);

    });
  });

  after(function () {
    server.restore();
  });

  it('should fetch json from a server', function(done) {
    var remoteRequest = new RemoteRequest(url, basePairsPerFetch);
    var promisedData = remoteRequest.get(interval);
    promisedData.then(e => {
      var ret = e.response.alignments;
      expect(remoteRequest.numNetworkRequests).to.equal(1);
      expect(e.status).to.equal(200);
      expect(ret.length).to.equal(14);
      done();
    });

    server.respond();
  });
});
