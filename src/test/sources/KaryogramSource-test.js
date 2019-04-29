/** @flow */
'use strict';

import {expect} from 'chai';

import sinon from 'sinon';

import ContigInterval from '../../main/ContigInterval';
import KaryogramSource from '../../main/sources/KaryogramSource';
import RemoteFile from '../../main/RemoteFile';

describe('KaryogramSource', function() {
  var server: any = null, response, source;

  beforeEach(function(): any {
    source = KaryogramSource.create({
      endpoint: '/endpoint'
    });

    return new RemoteFile('/test-data/basic-chromosomes.json').getAllString().then(data => {
      response = data;
      server = sinon.fakeServer.create();
    });

  });

  afterEach(function() {
    server.restore();
  });

  // it('should fetch genes from a server', function(done) {
  //   server.respondWith('POST', '/endpoint',
  //                      [200, { "Content-Type": "application/json" }, response]);
  //
  //   var requestInterval = new ContigInterval('chr17', 75000000, 75100000);
  //   expect(source.getFeaturesInRange(requestInterval))
  //       .to.deep.equal([]);
  //
  //   var progress = [];
  //   source.on('networkprogress', e => { progress.push(e); });
  //   source.on('networkdone', e => { progress.push('done'); });
  //   source.on('newdata', () => {
  //     var features = source.getFeaturesInRange(requestInterval);
  //     expect(features).to.have.length(1);
  //     done();
  //   });
  //
  //   source.rangeChanged({contig: 'chr1', start: 130000, stop: 135000});
  //   server.respond();
  // });

  it('should return empty with no data', function(done) {
    server.respondWith('POST', '/v0.6.0/features/search',
                       [200, { "Content-Type": "application/json" }, response]);

    var requestInterval = new ContigInterval('2', 10000, 20000);
    expect(source.getFeaturesInRange(requestInterval))
        .to.deep.equal([]);

    var progress = [];
    source.on('networkprogress', e => { progress.push(e); });
    source.on('networkdone', e => { progress.push('done'); });
    source.on('newdata', () => {
      var features = source.getFeaturesInRange(requestInterval);
      expect(features).to.have.length(0);
      done();
    });

    source.rangeChanged({contig: '2', start: 10000, stop: 20000});
    server.respond();
  });

});
