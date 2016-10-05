/**
 * This tests that the Controls and reference track render correctly, even when
 * an externally-set range uses a different chromosome naming system (e.g. '17'
 * vs 'chr17'). See https://github.com/hammerlab/pileup.js/issues/146
 * @flow
 */

'use strict';

import {expect} from 'chai';

import sinon from 'sinon';

import pileup from '../../main/pileup';
import dataCanvas from 'data-canvas';
import {waitFor} from '../async';
import RemoteFile from '../../main/RemoteFile';

describe('GenotypeTrack', function() {
  var server: any = null, response;

  before(function () {
    return new RemoteFile('/test-data/genotypes-17.json').getAllString().then(data => {
      response = data;
      server = sinon.fakeServer.create();
      server.respondWith('GET', '/genotypes/17?start=1&end=1000',[200, { "Content-Type": "application/json" }, response]);
    });
  });

  var testDiv = document.getElementById('testdiv');

  beforeEach(() => {
    testDiv.style.width = '800px';
    dataCanvas.RecordingContext.recordAll();
  });

  afterEach(() => {
    dataCanvas.RecordingContext.reset();
    // avoid pollution between tests.
    testDiv.innerHTML = '';
  });
  var {drawnObjects, callsOf} = dataCanvas.RecordingContext;

  function ready() {
    return testDiv.querySelector('canvas') &&
        drawnObjects(testDiv, '.genotypes').length > 0;
  }

  it('should render genotypes', function() {
    var p = pileup.create(testDiv, {
      // range: {contig: 'chrM', start: 0, stop: 30},
      range: {contig: '17', start: 9386380, stop: 9537420},
      tracks: [
        {
          viz: pileup.viz.genome(),
          data: pileup.formats.twoBit({
            url: '/test-data/test.2bit'
          }),
          isReference: true
        },
        {
          data: pileup.formats.genotypes({
            url: '/test-data/genotypes-17.json'
          }),
          viz: pileup.viz.genotypes(),
        }
      ]
    });

    return waitFor(ready, 2000)
      .then(() => {
        var genotypes = drawnObjects(testDiv, '.genotypes');
        var sampleIds = ["sample1", "sample2", "sample3"];
        expect(genotypes).to.have.length(3);
        expect(genotypes.map(g => g.variant.position)).to.deep.equal(
            [10, 20, 30]);
        expect(genotypes.map(g => g.sampleIds)).to.deep.equal(
            [sampleIds, sampleIds, sampleIds]);

        p.destroy();
      });
  });

});
