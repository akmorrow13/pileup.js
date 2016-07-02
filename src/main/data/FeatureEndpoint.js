/**
 * This module defines a parser for the 2bit file format.
 * See http://genome.ucsc.edu/FAQ/FAQformat.html#format7
 * @flow
 */
'use strict';

// import Q from 'q';
import type RemoteRequest from '../RemoteRequest';

type Feature = {
  id: string;
  featureType: string;
  contig: string;
  start: number;
  stop: number;
}

function extractFeatures(features: Object): Feature[] {
  return features;
}

class FeatureEndpoint {
  remoteRequest: RemoteRequest;

  constructor(remoteRequest: RemoteRequest) {
    this.remoteRequest = remoteRequest;
  }

  getFeaturesInRange(range: ContigInterval<string>): Q.Promise<Feature[]> {
     var contig = range.contig;
     var start = range.interval.start;
     var stop = range.interval.stop;

    return this.remoteRequest.get(contig, start, stop).then(object => {
      var d = extractFeatures(object);
      return d;
    });
  }
}

module.exports = FeatureEndpoint;
