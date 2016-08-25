/**
 * This module defines a parser for the 2bit file format.
 * See http://genome.ucsc.edu/FAQ/FAQformat.html#format7
 * @flow
 */
'use strict';

import ContigInterval from '../ContigInterval';
import Q from 'q';
import type RemoteRequest from '../RemoteRequest';
import type {Variant} from './vcf';

export type Genotype = {
  sampleIds: string,
  variant: Variant
}

class GenotypeEndpoint {
  remoteRequest: RemoteRequest;

  constructor(remoteRequest: RemoteRequest) {
    this.remoteRequest = remoteRequest;
  }

  getFeaturesInRange(range: ContigInterval<string>): Q.Promise<Genotype[]> {
    return this.remoteRequest.get(range).then(object => {
      return object;
    });
  }
}

module.exports = GenotypeEndpoint;
