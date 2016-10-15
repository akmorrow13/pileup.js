/**
 * This module defines a parser for the 2bit file format.
 * See http://genome.ucsc.edu/FAQ/FAQformat.html#format7
 * @flow
 */
'use strict';

import Q from 'q';
import ContigInterval from '../ContigInterval';
import type RemoteRequest from '../RemoteRequest';

export type SequenceRecord = {
  name: string;
  length: number;
}

class Sequence {
  remoteRequest: RemoteRequest;
  contigList: SequenceRecord[];

  constructor(remoteRequest: RemoteRequest, contigList: SequenceRecord[]) {
    this.remoteRequest = remoteRequest;
    this.contigList = contigList;
  }

    // Returns a list of contig names.
    getContigNames(): string[] {
      return this.contigList.map(seq => seq.name);
    }

    // Returns a list of contig names.
    getContigs(): SequenceRecord[] {
      return this.contigList;
    }

  /**
   * Returns the base pairs for contig:start-stop.
   * The range is inclusive and zero-based.
   * Returns empty string if no data is available on this range.
   */
  getFeaturesInRange(range: ContigInterval<string>): Q.Promise<string> {
    var start = range.start();
    var stop = range.stop();
    if (start > stop) {
      throw `Requested a range with start > stop (${start}, ${stop})`;
    }
    return this.remoteRequest.get(range).then(sequence => {
        var d = sequence.substring(start, (stop-start + 1));
        return d;
    });
  }

}

module.exports = Sequence;
