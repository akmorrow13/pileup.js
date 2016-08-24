/* @flow */
'use strict';

import {expect} from 'chai';

import sinon from 'sinon';

import ContigInterval from '../../main/ContigInterval';
import FeatureDataSource from '../../main/sources/FeatureDataSource';
import RemoteFile from '../../main/RemoteFile';

describe('FeatureDataSource', function() {
  var server: any = null, response;

  before(function () {
    return new RemoteFile('/test-data/features-chrM-1000-1200.json').getAllString().then(data => {
      response = data;
      server = sinon.fakeServer.create();
      server.respondWith('GET', '/features/chrM?start=1000&end=2000', [200, { "Content-Type": "application/json" }, response]);
    });
  });

  after(function () {
    server.restore();
  });

  function getTestSource() {
    var source = FeatureDataSource.create({
        url: '/features'
    });
    return source;
  }

  it('should extract features in a range', function(done) {
    var source = getTestSource();

    // No genes fetched initially
    var range = new ContigInterval('chrM', 1000, 1200);
    var emptyFeatures = source.getFeaturesInRange(range);
    expect(emptyFeatures).to.deep.equal([]);

    // Fetching that one gene should cache its entire block.
    source.on('newdata', () => {
      var features = source.getFeaturesInRange(range);
      expect(features).to.have.length(2);

      var feature = features[0];
      expect(feature.start).to.equal(1107);
      expect(feature.contig).to.equal('chrM');
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
