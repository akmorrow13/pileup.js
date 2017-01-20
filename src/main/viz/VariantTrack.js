/**
 * Visualization of variants
 * @flow
 */
'use strict';

import type {VcfDataSource} from '../sources/VcfDataSource';
import type {Variant} from '../data/vcf';
import type {DataCanvasRenderingContext2D} from 'data-canvas';
import type {VizProps} from '../VisualizationWrapper';
import type {Scale} from './d3utils';

import React from 'react';
import ReactDOM from 'react-dom';
import _ from 'underscore';

import d3utils from './d3utils';
import RemoteRequest from '../RemoteRequest';
import shallowEquals from 'shallow-equals';
import ContigInterval from '../ContigInterval';
import canvasUtils from './canvas-utils';
import TiledCanvas from './TiledCanvas';
import dataCanvas from 'data-canvas';
import style from '../style';
import utils from '../utils';
import type {State, NetworkStatus} from './pileuputils';

class VariantTiledCanvas extends TiledCanvas {
  options: Object;
  source: VcfDataSource;

  constructor(source: VcfDataSource, options: Object) {
    super();
    this.source = source;
    this.options = options;
  }

  update(newOptions: Object) {
    this.options = newOptions;
  }

  // TODO: can update to handle overlapping features
  heightForRef(ref: string): number {
    return style.VARIANT_HEIGHT;
  }

  render(ctx: DataCanvasRenderingContext2D,
         scale: (x: number)=>number,
         range: ContigInterval<string>) {
    var relaxedRange =
        new ContigInterval(range.contig, range.start() - 1, range.stop() + 1);
    var vVariants = this.source.getFeaturesInRange(relaxedRange);
    renderVariants(ctx, scale, relaxedRange, vVariants);
  }
}

// Draw variants
function renderVariants(ctx: DataCanvasRenderingContext2D,
                    scale: (num: number) => number,
                    range: ContigInterval<string>,
                    variants: Variant[]) {

    ctx.font = `${style.GENE_FONT_SIZE}px ${style.GENE_FONT}`;
    ctx.textAlign = 'center';

    variants.forEach(variant => {
      ctx.pushObject(variant);
      ctx.fillStyle = style.BASE_COLORS[variant.alt];
      ctx.strokeStyle = style.BASE_COLORS[variant.ref];
      var x = Math.round(scale(variant.position));
      var width = Math.round(scale(variant.end)) - x;
      ctx.fillRect(x - 0.2, 0, width, style.VARIANT_HEIGHT);
      ctx.strokeRect(x - 0.2, 0, width, style.VARIANT_HEIGHT);
      ctx.popObject();
    });

}

class VariantTrack extends React.Component {
  props: VizProps & {source: VcfDataSource};
  state: State;  // no state
  tiles: VariantTiledCanvas;

  constructor(props: Object) {
    super(props);
    this.state = {
      networkStatus: null
    };
  }

  render(): any {
    var statusEl = null,
        networkStatus = this.state.networkStatus;
    if (networkStatus) {
      statusEl = (
        <div ref='status' className='network-status-small'>
          <div className='network-status-message-small'>
            Loading Variants…
          </div>
        </div>
      );
    }
    var rangeLength = this.props.range.stop - this.props.range.start;
    // If range is too large, do not render 'canvas'
    if (rangeLength > RemoteRequest.MONSTER_REQUEST) {
       return (
        <div>
            <div className='center'>
              Zoom in to see variants
            </div>
            <canvas onClick={this.handleClick.bind(this)} />
          </div>
          );
    } else {
      return (
        <div>
          {statusEl}
          <div ref='container'>
            <canvas ref='canvas' onClick={this.handleClick.bind(this)} />
          </div>
        </div>
      );
    }
  }

  componentDidMount() {
    this.tiles = new VariantTiledCanvas(this.props.source, this.props.options);

    // Visualize ne data as it comes in from the network.
    this.props.source.on('newdata', (range) => {
      this.tiles.invalidateRange(range);
      this.updateVisualization();
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
          this.tiles.update(this.props.height, this.props.options);
          this.tiles.invalidateAll();
          this.updateVisualization();
    }
  }

  updateVisualization() {
    var canvas = (this.refs.canvas : HTMLCanvasElement),
        {width, height} = this.props;

    // Hold off until height & width are known.
    if (width === 0) return;
    d3utils.sizeCanvas(canvas, width, height);

    var ctx = dataCanvas.getDataContext(canvasUtils.getContext(canvas));
    this.renderScene(ctx);
  }

  renderScene(ctx: DataCanvasRenderingContext2D) {
    var range = this.props.range,
        interval = new ContigInterval(range.contig, range.start, range.stop),
        scale = this.getScale();
        // height = this.props.height,
        // y = height - style.VARIANT_HEIGHT - 1;

    ctx.reset();
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    this.tiles.renderToScreen(ctx, interval, scale);
  }

  handleClick(reactEvent: any) {
    var ev = reactEvent.nativeEvent,
        x = ev.offsetX;

    var genomeRange = this.props.range,
        // allow some buffering so click isn't so sensitive
        range = new ContigInterval(genomeRange.contig, genomeRange.start-1, genomeRange.stop+1),
        scale = this.getScale(),
        // leave padding of 2px to reduce click specificity
        clickStart = Math.floor(scale.invert(x)) - 2,
        clickEnd = clickStart + 2,
        // If click-tracking gets slow, this range could be narrowed to one
        // closer to the click coordinate, rather than the whole visible range.
        vVariants = this.props.source.getFeaturesInRange(range);

    var variant = _.find(vVariants, f => utils.tupleRangeOverlaps([[f.position], [f.end]], [[clickStart], [clickEnd]]));
    var alert = window.alert || console.log;
    if (variant) {
      alert(JSON.stringify(variant));
    }
  }
}

VariantTrack.displayName = 'variants';

module.exports = VariantTrack;
