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
      server.respondWith('GET', '/features/chrM?start=1&end=10000&binning=1', [200, { "Content-Type": "application/json" }, response]);
      server.respondWith('GET', '/features/chrM?start=1&end=1000', [200, { "Content-Type": "application/json" }, '']);
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

    // No features fetched initially
    var range = new ContigInterval('chrM', 1000, 1200);
    var emptyFeatures = source.getFeaturesInRange(range);
    expect(emptyFeatures).to.deep.equal([]);

    // Fetching that one gene should cache its entire block.
    source.on('newdata', () => {
      var features = source.getFeaturesInRange(range).sort((a, b) => {
        return a.start - b.start;
      });
      expect(features).to.have.length(2);

      var feature = features[0];
      expect(feature.start).to.equal(1011);
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

  it('should not fail when no feature data is available', function(done) {
    var source = getTestSource();

    var range = new ContigInterval('chrM', 1, 100);

    // Fetching that one gene should cache its entire block.
    source.on('newdata', () => {
      var features = source.getFeaturesInRange(range);
      expect(features).to.have.length(0);
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
