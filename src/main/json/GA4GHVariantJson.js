/**
 * A data source which implements generic JSON protocol.
 * Currently only used to load alignments.
 * @flow
 */
'use strict';

import type {VcfDataSource} from '../sources/VcfDataSource';
import type {VariantContext} from '../data/vcf';
import {Variant} from '../data/variant';

import _ from 'underscore';
import {Events} from 'backbone';

import ContigInterval from '../ContigInterval';

function create(json: string): VcfDataSource {

  // parse json
  var parsedJson = JSON.parse(json);
  var variants: Variant[] = [];

  // fill variants with json
  if (!_.isEmpty(parsedJson)) {
      variants = _.values(parsedJson.variants).map(variant => Variant.fromGA4GH(variant));
  }

  function rangeChanged(newRange: GenomeRange) {
    // Data is already parsed, so immediately return
    var range = new ContigInterval(newRange.contig, newRange.start, newRange.stop);
    o.trigger('newdata', range);
    o.trigger('networkdone');
    return;
  }

  function getVariantsInRange(range: ContigInterval<string>): Variant[] {
    if (!range) return [];
    var r = _.filter(variants, variant => variant.intersects(range));
    return r;
  }

  function getGenotypesInRange(range: ContigInterval<string>, resolution: ?number): VariantContext[] {
    throw new Error(`Function getGenotypesInRange not implemented`);
  }

  function getGenotypesInRange(range: ContigInterval<string>, resolution: ?number): VariantContext[] {
    throw new Error(`Function getGenotypesInRange not implemented`);
  }

  function getSamples(): string[] {
    throw new Error(`Function getSamples not implemented`);
  }

  var o = {
    rangeChanged,
    getVariantsInRange,
    getGenotypesInRange,
    getSamples,

    on: () => {},
    once: () => {},
    off: () => {},
    trigger: () => {}
  };
  _.extend(o, Events);
  return o;
}

module.exports = {
  create
};
