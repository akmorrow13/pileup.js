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
//
// /**
//  * Read 2-bit encoded base pairs from a DataView into an array of 'A', 'T',
//  * 'C', 'G' strings.
//  * These are returned as an array (rather than a string) to facilitate further
//  * modification.
//  */
// function unpackDNA(sequence: Object, startBasePair: number, numBasePairs: number): Array<string> {
//   // TODO: use jBinary bitfield for this
//   console.log("in unpack",dataView);
//   var basePairs: Array<string> = [];
//   for (var i = 0; i < dataView.byteLength; i++) {
//     var packed = dataView.getUint8(i);
//     basePairs[i] = String.fromCharCode(packed);
//   }
//   // Remove base pairs from the end if the sequence terminated mid-byte.
//   basePairs.length = numBasePairs;
//   return basePairs;
// }

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
    return this.remoteRequest.get(contig, start, stop).then(sequence => {
        // var dataView = new DataView(buffer);
        var d = sequence.substring(start, (stop-start + 1));
        return d;
    });
  }

}

module.exports = Sequence;
