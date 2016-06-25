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
      // server.respondWith('GET', '/variants',[200, { "Content-Type": "application/json" }, response]);
      server.respondWith('GET', '/variants/chrM?start=1&end=1000',[200, { "Content-Type": "application/json" }, response]);
    });
  });

  after(function () {
    server.restore();
  });

  function getTestSource() {
    var source = VariantDataSource.create({
      url: '/variants',
      contigList: [{
        name:"chrM",
        length: 1000
      },{
        name:"22",
        length: 1000
      }]
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
      var variants = source.getFeaturesInRange(range);
      console.log("variants",variants);
      expect(variants).to.have.length(2);
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
});
