/** @flow */
'use strict';

import {expect} from 'chai';

import GA4GHAlignment from '../main/GA4GHAlignment';
import RemoteFile from '../main/RemoteFile';
import Bam from '../main/data/bam';

describe('ADAM_Alignment', function() {
  var sampleAlignments = [];

  before(function() {
    return new RemoteFile('/test-data/adam-alignments.json').getAllString().then(data => {
      // console.log("data: "+ JSON.parse(data).alignments);
      sampleAlignments = JSON.parse(data).alignments;
      // console.log("sampleAlignments: " + sampleAlignments);
      // console.log("sampleAlignments length: " +sampleAlignments.length);
    });
  });
 
  it('should read the sample alignments', function() {
    // console.log("sampleAlignments length: " +sampleAlignments.length);
    expect(sampleAlignments).to.have.length(1046);
  });

  it('should provide basic accessors', function() {
    var a = new GA4GHAlignment(sampleAlignments[0]);
    expect(a.name).to.equal('613F0AAXX100423:5:47:2891:8862');
    expect(a.getSequence()).to.equal('GTTAATGTAGCTTAATAACAAAGCAAAGCACTGAAAATGCTTAGATGGATCATTGTATCCCATAAACACAAAGTTTTGGTCCTGGCCTTATAATTACTTAG');
    expect(a.getQualityScores()).to.deep.equal([17, 28, 10, 23, 27, 28, 17, 31, 22, 10, 16, 19, 9, 15, 16, 22, 15, 14, 15, 20, 15, 9, 15, 15, 9, 32, 32, 25, 27, 9, 21, 25, 32, 28, 28, 31, 31, 23, 22, 22, 9, 17, 22, 12, 25, 24, 14, 10, 26, 26, 10, 32, 26, 30, 32, 31, 25, 31, 31, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]);
    expect(a.getStrand()).to.equal('+');
    expect(a.getInterval().toString()).to.equal('chrM:0-58');  // 0-based
    expect(a.cigarOps).to.deep.equal([
      {length:59, op: 'M'},{length: 42,op:'S'}
    ]);
  });
  // Can not check with SamReads because we don't have the corresponding BAM file
});
