/**
 * This module defines a parser for the 2bit file format.
 * See http://genome.ucsc.edu/FAQ/FAQformat.html#format7
 * @flow
 */
'use strict';

import Q from 'q';
import type RemoteRequest from '../RemoteRequest';

export type SequenceRecord = {
  name: string;
  length: number;
}

/**
 * Read 2-bit encoded base pairs from a DataView into an array of 'A', 'T',
 * 'C', 'G' strings.
 * These are returned as an array (rather than a string) to facilitate further
 * modification.
 */
function unpackDNA(dataView: DataView, startBasePair: number, numBasePairs: number): Array<string> {
  // TODO: use jBinary bitfield for this
  var basePairs: Array<string> = [];
  // basePairs.length = dataView.byteLength * 4;  // pre-allocate
  for (var i = 0; i < dataView.byteLength; i++) {
    var packed = dataView.getUint8(i);
    basePairs[i] = String.fromCharCode(packed);
  }
  // Remove base pairs from the end if the sequence terminated mid-byte.
  basePairs.length = numBasePairs;
  return basePairs;
}

class Sequence {
  remoteRequest: RemoteRequest;
  contigList: SequenceRecord[];

  constructor(remoteRequest: RemoteRequest, contigList: SequenceRecord[]) {
    this.remoteRequest = remoteRequest;
    this.contigList = contigList;
  }

    // Returns a list of contig names.
      getContigList(): string[] {
      return this.contigList.map(seq => seq.name);
    }

  /**
   * Returns the base pairs for contig:start-stop.
   * The range is inclusive and zero-based.
   * Returns empty string if no data is available on this range.
   */
  getFeaturesInRange(contig: string, start: number, stop: number): Q.Promise<string> {
    if (start > stop) {
      throw `Requested a range with start > stop (${start}, ${stop})`;
    }
    return this.remoteRequest.get(contig, start, stop).then(buffer => {
        var dataView = new DataView(buffer);
        var d = unpackDNA(dataView, start % 4, stop - start + 1).join('');
        return d;
    });
  }

}

module.exports = Sequence;
