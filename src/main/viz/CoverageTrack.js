/**
 * Coverage visualization of Alignment sources.
 * @flow
 */
'use strict';

import type Interval from '../Interval';
import type {TwoBitSource} from '../sources/TwoBitDataSource';
import type {DataCanvasRenderingContext2D} from 'data-canvas';
import type {Scale} from './d3utils';
import type {CoverageDataSource} from '../sources/CoverageDataSource';
import type {VizProps} from '../VisualizationWrapper';
import RemoteRequest from '../RemoteRequest';
import type {PositionCount} from '../sources/CoverageDataSource';

import React from 'react';
import scale from '../scale';
import shallowEquals from 'shallow-equals';
import d3utils from './d3utils';
import _ from 'underscore';
import dataCanvas from 'data-canvas';
import canvasUtils from './canvas-utils';
import style from '../style';
import ContigInterval from '../ContigInterval';
import TiledCanvas from './TiledCanvas';
import type {State, NetworkStatus} from './pileuputils';
import {formatStatus} from './pileuputils';


class CoverageTiledCanvas extends TiledCanvas {
  height: number;
  options: Object;
  source: CoverageDataSource;

  constructor(source: CoverageDataSource, height: number, options: Object) {
    super();
    this.source = source;
    this.height = Math.max(1, height);
    this.options = options;
  }

  heightForRef(ref: string): number {
    return this.height;
  }

  update(height: number, options: Object) {
    // workaround for an issue in PhantomJS where height always comes out to zero.
    this.height = Math.max(1, height);
    this.options = options;
  }

  yScaleForRef(range: ContigInterval<string>, resolution: ?number): (y: number) => number {
    var maxCoverage = this.source.maxCoverage(range, resolution);

    return scale.linear()
      .domain([maxCoverage, 0])
      .range([style.COVERAGE_PADDING, this.height - style.COVERAGE_PADDING])
      .nice();
  }

  // This is called by TiledCanvas over all tiles in a range
  render(ctx: DataCanvasRenderingContext2D,
         xScale: (x: number)=>number,
         range: ContigInterval<string>,
         originalRange: ?ContigInterval<string>,
         resolution: ?number) {
    var relaxedRange = new ContigInterval(
       range.contig, Math.max(1, range.start() - 1), range.stop() + 1);
    var bins = this.source.getCoverageInRange(relaxedRange, resolution);

    // if original range is not set, use tiled range which is a subset of originalRange
    if (!originalRange) {
      originalRange = range;
    }

    var yScale = this.yScaleForRef(originalRange, resolution);
    renderBars(ctx, xScale, yScale, relaxedRange, bins, resolution, this.options);
  }
}


// Draw coverage bins
function renderBars(ctx: DataCanvasRenderingContext2D,
                    xScale: (num: number) => number,
                    yScale: (num: number) => number,
                    range: ContigInterval<string>,
                    bins: PositionCount[],
                    resolution: ?number,
                    options: Object) {
  if (_.isEmpty(bins)) return;

  // make sure bins are sorted by position
  bins = _.sortBy(bins, x => x.start);

  var barWidth = xScale(1) - xScale(0);
  var showPadding = (barWidth > style.COVERAGE_MIN_BAR_WIDTH_FOR_GAP);
  var padding = showPadding ? 1 : 0;

  var binPos = function(ps: PositionCount) {
    // Round to integer coordinates for crisp lines, without aliasing.
    var barX1 = Math.round(xScale(ps.start)),
        barX2 = Math.max(barX1 + 2, Math.round(xScale(ps.end)) - padding),  // make sure bar is >= 1px
        barY = Math.round(yScale(ps.count));
    return {barX1, barX2, barY};
  };

  var vBasePosY = yScale(0);  // the very bottom of the canvas

  // go to the first bin in dataset (specified by the smallest start position)
  ctx.fillStyle = style.COVERAGE_BIN_COLOR;
  ctx.beginPath();

  bins.forEach(bin => {
    ctx.pushObject(bin);
    let {barX1, barX2, barY} = binPos(bin);
    ctx.moveTo(barX1, vBasePosY);  // start at bottom left of bar
    ctx.lineTo(barX1, barY);       // left edge of bar
    ctx.lineTo(barX2, barY);       // top of bar
    ctx.lineTo(barX2, vBasePosY);  // right edge of the right bar.

    ctx.popObject();
  });
  ctx.closePath();
  ctx.fill();
}

class CoverageTrack extends React.Component {
  props: VizProps & { source: CoverageDataSource };
  state: State;
  static defaultOptions: Object;
  tiles: CoverageTiledCanvas;

  constructor(props: VizProps) {
    super(props);
    this.state = {
      networkStatus: null
    };
  }

  render(): any {
    // These styles allow vertical scrolling to see the full pileup.
    // Adding a vertical scrollbar shrinks the visible area, but we have to act
    // as though it doesn't, since adjusting the scale would put it out of sync
    // with other tracks.
    var containerStyles = {
      'height': '100%'
    };
    var statusEl = null,
        networkStatus = this.state.networkStatus;
    if (networkStatus) {
      var message = formatStatus(networkStatus);
      statusEl = (
        <div ref='status' className='network-status'>
          <div className='network-status-message'>
            Loading coverage… ({message})
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
              Zoom in to see coverage
            </div>
            <canvas onClick={this.handleClick.bind(this)} />
          </div>
          );
    } else {
      return (
        <div>
          {statusEl}
          <div ref='container' style={containerStyles}>
            <canvas ref='canvas' onClick={this.handleClick.bind(this)} />
          </div>
        </div>
      );
    }
  }

  getScale(): Scale {
    return d3utils.getTrackScale(this.props.range, this.props.width);
  }

  componentDidMount() {
    this.tiles = new CoverageTiledCanvas(this.props.source, this.props.height, this.props.options);

    this.props.source.on('newdata', range => {
      var oldMax = this.props.source.maxCoverage(range);
      this.props.source.getCoverageInRange(range);
      var newMax = this.props.source.maxCoverage(range);

      if (oldMax != newMax) {
        this.tiles.invalidateAll();
      } else {
        this.tiles.invalidateRange(range);
      }
      this.visualizeCoverage();
    });
    this.props.source.on('newdata', range => {
      this.tiles.invalidateRange(range);
      this.visualizeCoverage();
    });
    this.props.source.on('networkprogress', e => {
      this.setState({networkStatus: e});
    });
    this.props.source.on('networkdone', e => {
      this.setState({networkStatus: null});
    });
  }

  componentDidUpdate(prevProps: any, prevState: any) {
    if (!shallowEquals(this.props, prevProps) ||
        !shallowEquals(this.state, prevState)) {
      if (this.props.height != prevProps.height ||
          this.props.options != prevProps.options) {
        this.tiles.update(this.props.height, this.props.options);
        this.tiles.invalidateAll();
      }
      this.visualizeCoverage();
    }
  }

  getContext(): CanvasRenderingContext2D {
    var canvas = (this.refs.canvas : HTMLCanvasElement);
    // The typecast through `any` is because getContext could return a WebGL context.
    var ctx = ((canvas.getContext('2d') : any) : CanvasRenderingContext2D);
    return ctx;
  }

  // Draw three ticks on the left to set the scale for the user
  renderTicks(ctx: DataCanvasRenderingContext2D, yScale: (num: number)=>number) {
    var axisMax = yScale.domain()[0];
    [0, Math.round(axisMax / 2), axisMax].forEach(tick => {
      // Draw a line indicating the tick
      ctx.pushObject({value: tick, type: 'tick'});
      var tickPosY = Math.round(yScale(tick));
      ctx.strokeStyle = style.COVERAGE_FONT_COLOR;
      canvasUtils.drawLine(ctx, 0, tickPosY, style.COVERAGE_TICK_LENGTH, tickPosY);
      ctx.popObject();

      if (tick > 0) {
          var tickLabel = tick + 'X';
          ctx.pushObject({value: tick, label: tickLabel, type: 'label'});
          // Now print the coverage information
          ctx.font = style.COVERAGE_FONT_STYLE;
          var textPosX = style.COVERAGE_TICK_LENGTH + style.COVERAGE_TEXT_PADDING,
              textPosY = tickPosY + style.COVERAGE_TEXT_Y_OFFSET;
          // The stroke creates a border around the text to make it legible over the bars.
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 2;
          ctx.strokeText(tickLabel, textPosX, textPosY);
          ctx.lineWidth = 1;
          ctx.fillStyle = style.COVERAGE_FONT_COLOR;
          ctx.fillText(tickLabel, textPosX, textPosY);
          ctx.popObject();
      }

    });
  }

  visualizeCoverage() {
    var canvas = (this.refs.canvas : HTMLCanvasElement),
        width = this.props.width,
        height = this.props.height,
        range = ContigInterval.fromGenomeRange(this.props.range);

    // Hold off until height & width are known.
    if (width === 0 || typeof canvas == 'undefined') return;
    d3utils.sizeCanvas(canvas, width, height);

    var ctx = dataCanvas.getDataContext(this.getContext());
    ctx.save();
    ctx.reset();
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    var yScale = this.tiles.yScaleForRef(range);

    this.tiles.renderToScreen(ctx, range, this.getScale());
    this.renderTicks(ctx, yScale);

    ctx.restore();
  }

  handleClick(reactEvent: any) {
    var ev = reactEvent.nativeEvent,
        x = ev.offsetX;

    // It's simple to figure out which position was clicked using the x-scale.
    // No need to render the scene to determine what was clicked.
    var range = ContigInterval.fromGenomeRange(this.props.range),
        xScale = this.getScale(),
        bins = this.props.source.getCoverageInRange(range),
        pos = Math.floor(xScale.invert(x)) - 1,
        bin = bins[pos];

    var alert = window.alert || console.log;
    if (bin) {
      // Construct a JSON object to show the user.
      var messageObject = _.extend(
        {
          'position': range.contig + ':' + (1 + pos),
          'read depth': bin.count
        });
      alert(JSON.stringify(messageObject, null, '  '));
    }
  }
}

CoverageTrack.displayName = 'coverage';

module.exports = CoverageTrack;
