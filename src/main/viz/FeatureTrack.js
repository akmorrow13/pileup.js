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
import _ from 'underscore';

import d3utils from './d3utils';
import scale from '../scale';
import ContigInterval from '../ContigInterval';
import canvasUtils from './canvas-utils';
import dataCanvas from 'data-canvas';
import style from '../style';
import type {State, NetworkStatus} from './pileuputils';

class FeatureTrack extends React.Component {
  props: VizProps & { source: FeatureDataSource };
  state: State;
  cache: {features: Feature[]};

  constructor(props: VizProps) {
    super(props);
    this.state = {
      networkStatus: null
    };
    this.cache = {
      features: []
    };
  }

  render(): any {
    var statusEl = null,
        networkStatus = this.state.networkStatus;
    if (networkStatus) {
      statusEl = (
        <div ref='status' className='network-status-small'>
          <div className='network-status-message-small'>
            Loading features…
          </div>
        </div>
      );
    }
    var rangeLength = this.props.range.stop - this.props.range.start;
    return (
      <div>
        {statusEl}
        <div ref='container'>
          <canvas ref='canvas' onClick={this.handleClick.bind(this)} />
        </div>
      </div>
    );
  }

  componentDidMount() {
    // Visualize new reference data as it comes in from the network.
    this.props.source.on('newdata', (range) => {
      this.cache = {
        features: this.props.source.getFeaturesInRange(range)
      };
    });
    this.props.source.on('networkprogress', e => {
      this.setState({networkStatus: e});
    });
    this.props.source.on('networkdone', e => {
      this.setState({networkStatus: null});
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
    var canvas = (this.refs.canvas : HTMLCanvasElement),
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
    this.cache.features.forEach(feature => {
      var position = new ContigInterval(feature.contig, feature.start, feature.stop);
      if (!position.chrIntersects(range)) return;
      ctx.pushObject(feature);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'black';
      var opacity = feature.score/1000;
      ctx.fillStyle = `rgba(0,0,0,${opacity})`;

      var x = Math.round(sc(feature.start));
      var width = Math.round(sc(feature.stop) - sc(feature.start));
      ctx.fillRect(x - 0.5, y - 0.5, width, style.VARIANT_HEIGHT);
      ctx.strokeRect(x - 0.5, y - 0.5, width, style.VARIANT_HEIGHT);
      ctx.popObject();
    });
  }

  handleClick(reactEvent: any) {
    var ev = reactEvent.nativeEvent,
        x = ev.offsetX,
        y = ev.offsetY;
    var ctx = canvasUtils.getContext(this.refs.canvas);
    var trackingCtx = new dataCanvas.ClickTrackingContext(ctx, x, y);
    console.log("handle click");

    var genomeRange = this.props.range,
        range = new ContigInterval(genomeRange.contig, genomeRange.start, genomeRange.stop),
        scale = this.getScale(),
        pos = Math.floor(scale.invert(x)),
        // If click-tracking gets slow, this range could be narrowed to one
        // closer to the click coordinate, rather than the whole visible range.
        vFeatures = this.props.source.getFeaturesInRange(range);
    var feature = _.find(this.cache.features, f => f.start <= pos && f.stop >= pos);
    var alert = window.alert || console.log;
    if (feature) {
      // Construct a JSON object to show the user.
      var messageObject = _.extend(
        {
          'id': feature.id,
          'range': `${feature.contig}:${feature.start}-${feature.stop}`,
          'score': feature.score
        });
      alert(JSON.stringify(messageObject, null, '  '));
    }
  }
}

FeatureTrack.displayName = 'features';

module.exports = FeatureTrack;
