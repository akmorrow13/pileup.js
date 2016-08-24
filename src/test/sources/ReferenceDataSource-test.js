  /** @flow */
'use strict';

import {expect} from 'chai';

import sinon from 'sinon';

import ReferenceDataSource from '../../main/sources/ReferenceDataSource';
import RemoteFile from '../../main/RemoteFile';

describe('ReferenceDataSource', function() {
var server: any = null, response;

before(function () {
  return new RemoteFile('/test-data/reference-chrM-0-1000.json').getAllString().then(data => {
    response = data;
    server = sinon.fakeServer.create();
    server.respondWith('GET', '/reference/chrM?start=0&end=10000',[200, { "Content-Type": "application/json" }, response]);
    server.respondWith('GET', '/reference/22?start=0&end=10000',[200, { "Content-Type": "application/json" }, response]);
    server.respondWith('GET', '/reference/22?start=10001&end=20000',[200, { "Content-Type": "application/json" }, response]);
  });
});

after(function () {
  server.restore();
});

function getTestSource() {
  var source = ReferenceDataSource.create({
    url: '/reference',
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

it('should fetch contigs', function() {
  var source = getTestSource();
  var contigs = source.contigList();
  expect(contigs).to.deep.equal(['chrM','22']);
});

it('should normalize range', function() {
  var source = getTestSource();
  var range = {contig: 'chrM', start: 0, stop: 3};
  source.normalizeRange(range).then(normalized => {
    expect(normalized.to.deep.equal(range));
  }).done();
});

it('should fetch base pairs', function(done) {
  var source = getTestSource();
  var range = {contig: 'chrM', start: 0, stop: 3};

  // Before data has been fetched, all base pairs are null.
   expect(source.getRange(range)).to.deep.equal({
     'chrM:0': null,
     'chrM:1': null,
     'chrM:2': null,
     'chrM:3': null
   });
   expect(source.getRangeAsString(range)).to.equal('....');

  source.on('newdata', () => {
    expect(source.getRange(range)).to.deep.equal({
     'chrM:0': 'N',
     'chrM:1': 'G',
     'chrM:2': 'T',
     'chrM:3': 'T'
    });
    expect(source.getRangeAsString(range)).to.equal('NGTT');
    done();
  });
  source.rangeChanged(range);
  server.respond();
});

it('should add new chunk', function(done) {
  var source = getTestSource();
  var range1 = {contig: 'chrM', start: 0, stop: 3};
  var range2 = {contig: 'chrM', start: 10000, stop: 10003};

  source.on('newdata', () => {
    expect(source.getRange(range1)).to.deep.equal({
     'chrM:0': 'N',
     'chrM:1': 'G',
     'chrM:2': 'T',
     'chrM:3': 'T'
    });
    expect(source.getRangeAsString(range1)).to.equal('NGTT');

    done();
  });
  source.rangeChanged(range1);
  server.respond();

  source.on('newdata', () => {

    expect(source.getRange(range2)).to.deep.equal({
     'chrM:0': 'N',
     'chrM:1': 'G',
     'chrM:2': 'T',
     'chrM:3': 'T'
    });
    expect(source.getRangeAsString(range2)).to.equal('NGTT');

    done();
  });
  source.rangeChanged(range2);
  server.respond();

});

it('should fetch nearby base pairs', function(done) {
  var source = getTestSource();

  source.on('newdata', () => {
    expect(source.getRange({contig: 'chrM', start: 0, stop: 14}))
        .to.deep.equal({
          'chrM:0':  'N',
          'chrM:1':  'G',
          'chrM:2':  'T',
          'chrM:3':  'T',
          'chrM:4':  'A',  // start of actual request
          'chrM:5':  'A',
          'chrM:6':  'T',
          'chrM:7':  'G',
          'chrM:8':  'T',
          'chrM:9':  'A',  // end of actual requuest
          'chrM:10': 'G',
          'chrM:11': 'C',
          'chrM:12': 'T',
          'chrM:13': 'T',
          'chrM:14': 'A'
        });
    done();
  });
  source.rangeChanged({contig: 'chrM', start: 4, stop: 9});
  server.respond();
});

it('should add chr', function(done) {
  var source = getTestSource();
  var range = {contig: '22', start: 0, stop: 3};

  source.on('newdata', () => {

    expect(source.getRange(range)).to.deep.equal({
      '22:0': 'N',
      '22:1': 'G',
      '22:2': 'T',
      '22:3': 'T'
    });
    expect(source.getRangeAsString(range)).to.equal('NGTT');
    done();
  });
  source.rangeChanged(range);
  server.respond();
});

it('should only report newly-fetched ranges', function(done) {
  ReferenceDataSource.testBasePairsToFetch(10);
  var initRange = {contig: 'chrM', start: 5, stop: 8},
      secondRange = {contig: 'chrM', start: 8, stop: 15};
  var source = getTestSource();
  source.once('newdata', newRange => {
    expect(newRange.toString()).to.equal('chrM:0-10');  // expanded range

    source.once('newdata', newRange => {
      // This expanded range excludes previously-fetched data.
      expect(newRange.toString()).to.equal('chrM:11-20');
      done();
    });
    source.rangeChanged(secondRange);
    server.respond();
  });
  source.rangeChanged(initRange);
  server.respond();
});


});
