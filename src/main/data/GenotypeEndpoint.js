/**
 * This module defines a parser for the 2bit file format.
 * See http://genome.ucsc.edu/FAQ/FAQformat.html#format7
 * @flow
 */
'use strict';

import Q from 'q';
import type RemoteRequest from '../RemoteRequest';
import type {Variant} from './vcf';


export type Genotype = {
  sampleIds: string,
  variant: Variant
}


function extractGenotypes(genotypes: Object): Genotype[] {
  return genotypes;
}

class GenotypeEndpoint {
  remoteRequest: RemoteRequest;

  constructor(remoteRequest: RemoteRequest) {
    this.remoteRequest = remoteRequest;
  }

  getFeaturesInRange(range: ContigInterval<string>): Q.Promise<Genotype[]> {
     var contig = range.contig;
     var start = range.interval.start;
     var stop = range.interval.stop;


    return this.remoteRequest.get(contig, start, stop).then(object => {
      var d = extractGenotypes(object);
      return d;
    });
  }
}

module.exports = GenotypeEndpoint;
