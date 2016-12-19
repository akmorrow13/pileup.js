/* @flow */
'use strict';


import {expect} from 'chai';

import sinon from 'sinon';

import GenotypeDataSource from '../../main/sources/GenotypeDataSource';
import ContigInterval from '../../main/ContigInterval';
import RemoteFile from '../../main/RemoteFile';

describe('GenotypeDataSource', function() {
  var server: any = null, response;

  before(function () {
    return new RemoteFile('/test-data/genotypes-chrM-0-100.json').getAllString().then(data => {
      response = data;
      server = sinon.fakeServer.create();
      server.respondWith('GET', '/genotypes/chrM?start=1&end=1000',[200, { "Content-Type": "application/json" }, response]);
      server.respondWith('GET', '/genotypes/chrM?start=1000&end=2000',[200, { "Content-Type": "application/json" }, response]);
    });
  });

  after(function () {
    server.restore();
  });

  function getTestSource() {
    var source = GenotypeDataSource.create({
      url: '/genotypes'
    });
    return source;
  }

  it('should extract features in a range', function(done) {
    var source = getTestSource();
    var range = new ContigInterval('chrM', 0, 25);
    // No genotypes are cached yet.
    var genotypes = source.getFeaturesInRange(range);
    expect(genotypes).to.deep.equal([]);

    source.on('newdata', () => {
      var genotypes = source.getFeaturesInRange(range);
      expect(genotypes).to.have.length(2);
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

  it('should not fail when no genotypes are available', function(done) {
    var source = getTestSource();
    var range = new ContigInterval('chrM', 1000, 1025);

    source.on('newdata', () => {
      var genotypes = source.getFeaturesInRange(range);
      expect(genotypes).to.have.length(0);
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
