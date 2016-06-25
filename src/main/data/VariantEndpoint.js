/**
 * This module defines a parser for the 2bit file format.
 * See http://genome.ucsc.edu/FAQ/FAQformat.html#format7
 * @flow
 */
'use strict';

import Q from 'q';
import type RemoteRequest from '../RemoteRequest';

function extractVariants(variants: Object): Variant[] {
  return variants;
}

class VariantEndpoint {
  remoteRequest: RemoteRequest;

  constructor(remoteRequest: RemoteRequest) {
    this.remoteRequest = remoteRequest;
  }

  getFeaturesInRange(range: ContigInterval<string>): Q.Promise<Variant[]> {
     var contig = range.contig;
     var start = range.interval.start;
     var stop = range.interval.stop;
     console.log("in get range endpoint", range);

      return this.remoteRequest.get(contig, start, stop).then(object => {
          var d = extractVariants(object); // TODO: should parts to Variant[]
          return d;
    });
  }
}

module.exports = VariantEndpoint;
