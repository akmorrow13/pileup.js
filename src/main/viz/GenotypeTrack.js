/**
 * Visualization of genotypes
 * @flow
 */
'use strict';

import type {GenotypeDataSource} from '../sources/GenotypeDataSource';
import type {Genotype} from '../data/GenotypeEndpoint';
import type {DataCanvasRenderingContext2D} from 'data-canvas';
import type {VizProps} from '../VisualizationWrapper';
import type {Scale} from './d3utils';

import React from 'react';
import ReactDOM from 'react-dom';

import d3utils from './d3utils';
import shallowEquals from 'shallow-equals';
import ContigInterval from '../ContigInterval';
import canvasUtils from './canvas-utils';
import dataCanvas from 'data-canvas';
import style from '../style';

function yForRow(row) {
  return row * (style.GENOTYPE_HEIGHT + style.GENOTYPE_SPACING);
}

class GenotypeTrack extends React.Component {
  props: VizProps & {source: GenotypeDataSource};
  state: void;  // no state

  constructor(props: Object) {
    super(props);
  }

  render(): any {
    return <canvas onClick={this.handleClick} />;
  }

  componentDidMount() {
    this.updateVisualization();

    this.props.source.on('newdata', () => {
      this.updateVisualization();
    });
  }

  getScale(): Scale {
    return d3utils.getTrackScale(this.props.range, this.props.width);
  }

  componentDidUpdate(prevProps: any, prevState: any) {
    if (!shallowEquals(prevProps, this.props) ||
        !shallowEquals(prevState, this.state)) {
      this.updateVisualization();
    }
  }

  updateVisualization() {
    var canvas = ReactDOM.findDOMNode(this),
        {width, height} = this.props;

    // Hold off until height & width are known.
    if (width === 0) return;

    var ctx = canvasUtils.getContext(canvas);
    var dtx = dataCanvas.getDataContext(ctx);
    this.renderScene(dtx);
  }

  renderScene(ctx: DataCanvasRenderingContext2D) {
    var range = this.props.range,
        interval = new ContigInterval(range.contig, range.start, range.stop),
        genotypes = this.props.source.getFeaturesInRange(interval),
        scale = this.getScale(),
        sampleIds = [];

    // add all samples to array of sample Ids
    genotypes.forEach(genotype => {
      var ids = genotype.sampleIds;
      for (var i = 0; i < ids.length; i++) {
        var id = ids[i];
        if (sampleIds.indexOf(id) < 0) {
          sampleIds.push(id);
        }
      }
    });
    sampleIds = sampleIds.sort(); // sort sample ids

    // Height can only be computed after the genotypes has been updated.
    var newHeight = yForRow(sampleIds.length);
    var canvas = ReactDOM.findDOMNode(this),
        {width, height} = this.props;
    d3utils.sizeCanvas(canvas, width, newHeight);

    // This is a hack to adjust parent div for resize
    var el = d3utils.findParent(canvas, 'track-content');
    if (el) el.style.height = newHeight;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.reset();
    ctx.save();

    ctx.fillStyle = style.GENOTYPE_FILL;
    genotypes.forEach(genotype => {
      var variant = genotype.variant;
      var keys = genotype.sampleIds;
      ctx.pushObject(variant);
      var x = Math.round(scale(variant.position));
      var width = Math.round(scale(variant.position + 1)) - 1 - x;
      keys.forEach(sampleId => {
        var y = yForRow(sampleIds.indexOf(sampleId));
        ctx.fillRect(x - 0.5, y - 0.5, width, style.GENOTYPE_HEIGHT);
      });
      ctx.popObject();
    });

    ctx.restore();
  }

  handleClick(reactEvent: any) {
    var ev = reactEvent.nativeEvent,
        x = ev.offsetX,
        y = ev.offsetY,
        canvas = ReactDOM.findDOMNode(this),
        ctx = canvasUtils.getContext(canvas),
        trackingCtx = new dataCanvas.ClickTrackingContext(ctx, x, y);
    this.renderScene(trackingCtx);
    var genotype = trackingCtx.hit && trackingCtx.hit[0];
    var alert = window.alert || console.log;
    if (genotype) {
      alert(JSON.stringify(genotype));
    }
  }
}

GenotypeTrack.displayName = 'genotypes';

module.exports = GenotypeTrack;
