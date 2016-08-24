/**
 * This module defines a parser for the 2bit file format.
 * See http://genome.ucsc.edu/FAQ/FAQformat.html#format7
 * @flow
 */
'use strict';

import Q from 'q';
import ContigInterval from '../ContigInterval';
import type RemoteRequest from '../RemoteRequest';

export type Feature = {
  id: string;
  featureType: string;
  contig: string;
  start: number;
  stop: number;
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
      return object;
    });
  }
}

module.exports = FeatureEndpoint;
