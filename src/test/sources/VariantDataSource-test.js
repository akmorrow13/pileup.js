/* @flow */
'use strict';


import {expect} from 'chai';

import sinon from 'sinon';

import VariantDataSource from '../../main/sources/VariantDataSource';
import ContigInterval from '../../main/ContigInterval';
import RemoteFile from '../../main/RemoteFile';

describe('VariantDataSource', function() {
  var server: any = null, response;

  before(function () {
    return new RemoteFile('/test-data/variants-chrM-0-100.json').getAllString().then(data => {
      response = data;
      server = sinon.fakeServer.create();
      server.respondWith('GET', '/variants/chrM?start=1&end=10000&binning=1',[200, { "Content-Type": "application/json" }, response]);
      server.respondWith('GET', '/variants/chrM?start=1000&end=2000',[200, { "Content-Type": "application/json" }, '']);
    });
  });

  after(function () {
    server.restore();
  });

  function getTestSource() {
    var source = VariantDataSource.create({
      url: '/variants',
      samples: ["sample1", "sample2", "sample3"]
    });
    return source;
  }
  it('should extract features in a range', function(done) {
    var source = getTestSource();
    var range = new ContigInterval('chrM', 0, 50);
    // No variants are cached yet.
    var variants = source.getVariantsInRange(range);
    expect(variants).to.deep.equal([]);

    source.on('newdata', () => {
      var variants = source.getVariantsInRange(range);
      expect(variants).to.have.length(3);
      expect(variants[1].contig).to.equal('chrM');
      expect(variants[1].position).to.equal(20);
      expect(variants[1].ref).to.equal('G');
      expect(variants[1].alt).to.equal('T');
      done();
    });
    source.rangeChanged({
      contig: range.contig,
      start: range.start(),
      stop: range.stop()
    });
    server.respond();
  });

  it('should not fail when no variants are availble', function(done) {
    var source = getTestSource();
    var range = new ContigInterval('chrM', 1050, 1150);

    source.on('newdata', () => {
      var variants = source.getVariantsInRange(range);
      expect(variants).to.deep.equal([]);
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
