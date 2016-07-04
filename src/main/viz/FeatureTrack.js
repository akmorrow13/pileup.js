/**
 * Visualization of features, including exons and coding regions.
 * @flow
 */
'use strict';

import type {FeatureDataSource} from '../sources/FeatureDataSource';
import type {Feature} from '../data/FeatureEndpoint';

import type {VizProps} from '../VisualizationWrapper';
import type {Scale} from './d3utils';

import React from 'react';
import ReactDOM from 'react-dom';
import shallowEquals from 'shallow-equals';

import d3utils from './d3utils';
import scale from '../scale';
import ContigInterval from '../ContigInterval';
import canvasUtils from './canvas-utils';
import dataCanvas from 'data-canvas';
import style from '../style';


class FeatureTrack extends React.Component {
  props: VizProps & { source: FeatureDataSource };
  state: {features: Feature[]};

  constructor(props: VizProps) {
    super(props);
    this.state = {
      features: []
    };
  }

  render(): any {
    return <canvas />;
  }

  componentDidMount() {
    // Visualize new reference data as it comes in from the network.
    this.props.source.on('newdata', (range) => {
      this.setState({
        features: this.props.source.getFeaturesInRange(range)
      });
    });

    this.updateVisualization();
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
        {width, height} = this.props,
        genomeRange = this.props.range;

    var range = new ContigInterval(genomeRange.contig, genomeRange.start, genomeRange.stop);
    var y = height - style.VARIANT_HEIGHT - 1;

    // Hold off until height & width are known.
    if (width === 0) return;

    var sc = this.getScale();

    d3utils.sizeCanvas(canvas, width, height);

    var ctx = dataCanvas.getDataContext(canvasUtils.getContext(canvas));
    ctx.reset();
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // TODO: don't pull in features via state.
    ctx.font = `${style.GENE_FONT_SIZE}px ${style.GENE_FONT}`;
    ctx.textAlign = 'center';
    this.state.features.forEach(feature => {
      var position = new ContigInterval(feature.contig, feature.start, feature.stop);
      if (!position.chrIntersects(range)) return;
      ctx.pushObject(feature);
      ctx.lineWidth = 1;
      ctx.strokeStyle = style.GENE_COLOR;
      ctx.fillStyle = style.GENE_COLOR;

      var x = Math.round(sc(feature.start));
      var width = Math.round(sc(feature.stop) - sc(feature.start));
      ctx.fillRect(x - 0.5, y - 0.5, width, style.VARIANT_HEIGHT);
      ctx.strokeRect(x - 0.5, y - 0.5, width, style.VARIANT_HEIGHT);
      ctx.popObject();
    });
  }
}

FeatureTrack.displayName = 'features';

module.exports = FeatureTrack;
