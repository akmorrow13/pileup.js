/* @flow */
'use strict';

import {expect} from 'chai';

import dataCanvas from 'data-canvas';
import filterUtils from '../../../main/viz/filters/filterUtils';
import type {VcfFilter} from '../../../main/viz/filters/VariantFilter';
import VariantFilter from '../../../main/viz/filters/VariantFilter';
import pileup from '../../../main/pileup';
import {waitFor} from '../../async';

describe('VariantFilter', function() {
  var didChange: boolean = false;

  // create SyntheticEvent
  var event = {
    cancelable: true,
    preventDefault: () => {},
    type: "test",
    bubbles: false,
    currentTarget: {},
    defaultPrevented: true,
    eventPhase: 0,
    isTrusted: true,
    nativeEvent: {},
    isDefaultPrevented: () => {return true;},
    stopPropagation: () => {},
    isPropagationStopped: () => {return true;},
    target: {},
    timeStamp: 0
  };

  var tracks = [
    {
      viz: pileup.viz.genome(),
      isReference: true,
      data: pileup.formats.twoBit({
        url: '/test-data/test.2bit'
      }),
      cssClass: 'a'
    },
    {
      viz: pileup.viz.variants(),
      data: pileup.formats.vcf({
        url: '/test-data/snv.chr17.vcf'
      }),
      cssClass: 'b'
    }
  ];

  var testDiv = document.getElementById('testdiv');

  beforeEach(() => {
    dataCanvas.RecordingContext.recordAll();  // record all data canvases
  });

  afterEach(function() {
    dataCanvas.RecordingContext.reset();
    testDiv.innerHTML = '';  // avoid pollution between tests.
  });

  function getProps(): Object {
    var vcfFilter: VcfFilter = filterUtils.initVariantFilters();

    var props = {
      filters: vcfFilter,
      onChange: function(filter: VcfFilter) {
        didChange = true;
      }
    };
    return props;
  }

  it('should render html', function(done) {
    var props = getProps();
    var filter: VariantFilter = new VariantFilter(props);
    var html = filter.render();
    expect(html.type).to.equal("form");
    done();
  });

  it('should trigger onchange', function(done) {
    var props = getProps();
    var filter: VariantFilter = new VariantFilter(props);
    filter.handleFilterSubmit(event);
    expect(didChange).to.equal(true);
    done();
  });

});
