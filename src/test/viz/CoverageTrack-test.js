/**
 * This tests whether coverage information is being shown/drawn correctly
 * in the track. The alignment information comes from the test BAM files.
 *
 * @flow
 */
'use strict';

import {expect} from 'chai';

import sinon from 'sinon';

import RemoteFile from '../../main/RemoteFile';
import pileup from '../../main/pileup';
import TwoBit from '../../main/data/TwoBit';
import TwoBitDataSource from '../../main/sources/TwoBitDataSource';
import MappedRemoteFile from '../MappedRemoteFile';
import dataCanvas from 'data-canvas';
import {waitFor} from '../async';

describe('CoverageTrack', function() {
  var testDiv = document.getElementById('testdiv');
  var range = {contig: '17', start: 0, stop: 100};
  var p;

  var server: any = null, response;

  before(function () {
    return new RemoteFile('/test-data/chr17-coverage.json').getAllString().then(data => {
      response = data;
      server = sinon.fakeServer.create();
      server.respondWith('GET', '/coverage/17?start=1&end=1000&binning=1',[200, { "Content-Type": "application/json" }, response]);
    });
  });

  after(function () {
    server.restore();
  });


  beforeEach(() => {
    dataCanvas.RecordingContext.recordAll();
    // A fixed width container results in predictable x-positions for mismatches.
    testDiv.style.width = '800px';
    p = pileup.create(testDiv, {
      range: range,
      tracks: [
        {
          data: referenceSource,
          viz: pileup.viz.genome(),
          isReference: true
        },
        {
          viz: pileup.viz.coverage(),
          data: pileup.formats.coverage({
            url: '/coverage',
          }),
          cssClass: 'coverage',
          name: 'Coverage'
        }
      ]
    });
  });

  afterEach(() => {
    dataCanvas.RecordingContext.reset();
    if (p) p.destroy();
    // avoid pollution between tests.
    testDiv.innerHTML = '';
    testDiv.style.width = '';
  });

  var twoBitFile = new MappedRemoteFile(
      '/test-data/hg19.2bit.mapped',
      [[0, 16383], [691179834, 691183928], [694008946, 694011447]]);
  var referenceSource = TwoBitDataSource.createFromTwoBitFile(new TwoBit(twoBitFile));

  var {drawnObjectsWith, callsOf} = dataCanvas.RecordingContext;

  var findCoverageBins = () => {
    return drawnObjectsWith(testDiv, '.coverage', b => b.count);
  };

  var findCoverageLabels = () => {
    return drawnObjectsWith(testDiv, '.coverage', l => l.type == 'label');
  };

  var hasCoverage = () => {
    // Check whether the coverage bins are loaded yet
    return testDiv.querySelector('canvas') &&
        findCoverageBins().length > 1 &&
        findCoverageLabels().length > 1;
  };

  it('should create coverage information for all bases shown in the view', function() {
    return waitFor(hasCoverage, 2000).then(() => {
      var bins = findCoverageBins();
      expect(bins).to.have.length.at.least(range.stop - range.start + 1);
    });
  });

  it('should create correct labels for coverage', function() {
    return waitFor(hasCoverage, 2000).then(() => {
      // These are the objects being used to draw labels
      var labelTexts = findCoverageLabels();
      expect(labelTexts[0].label).to.equal('0X');
      expect(labelTexts[labelTexts.length-1].label).to.equal('50X');

      // Now let's test if they are actually being put on the screens
      var texts = callsOf(testDiv, '.coverage', 'fillText');
      expect(texts.map(t => t[1])).to.deep.equal(['0X', '25X', '50X']);
    });
  });

});
