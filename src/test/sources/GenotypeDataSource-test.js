/* @flow */
'use strict';


import {expect} from 'chai';

import sinon from 'sinon';

import VariantDataSource from '../../main/sources/GenotypeDataSource';
import ContigInterval from '../../main/ContigInterval';
import RemoteFile from '../../main/RemoteFile';

describe('GenotypeDataSource', function() {
  var server: any = null, response;

  before(function () {
    return new RemoteFile('/test-data/genotypes-chrM-0-100.json').getAllString().then(data => {
      response = data;
      server = sinon.fakeServer.create();
      server.respondWith('GET', '/genotypes/chrM?start=1&end=1000&key=test',[200, { "Content-Type": "application/json" }, response]);
    });
  });

  after(function () {
    server.restore();
  });

  function getTestSource() {
    var source = VariantDataSource.create({
      url: '/genotypes',
      key: 'test'
    });
    return source;
  }
  it('should extract features in a range', function(done) {
    var source = getTestSource();
    var range = new ContigInterval('chrM', 0, 25);
    // No variants are cached yet.
    var variants = source.getFeaturesInRange(range);
    expect(variants).to.deep.equal([]);

    source.on('newdata', () => {
      var genotypes = source.getFeaturesInRange(range);
      expect(genotypes).to.have.length(3);
      expect(genotypes[1].sampleIds).to.contain('sample1');
      expect(genotypes[1].variant.contig).to.equal('chrM');
      expect(genotypes[1].variant.position).to.equal(20);
      expect(genotypes[1].variant.ref).to.equal('G');
      expect(genotypes[1].variant.alt).to.equal('T');
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
