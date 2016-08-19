/**
 * Root of the React component tree.
 * @flow
 */
'use strict';

import type {TwoBitSource} from './sources/TwoBitDataSource';
import type {VisualizedTrack, VizWithOptions} from './types';

import React from 'react';
import Controls from './Controls';
import type {VcfFilter} from './viz/filters/VariantFilter';
import VariantFilter from './viz/filters/VariantFilter';
import VariantTrack from './viz/VariantTrack';
import Menu from './Menu';
import filterUtils from './viz/filters/filterUtils';
import VisualizationWrapper from './VisualizationWrapper';

type Props = {
  referenceSource: TwoBitSource;
  tracks: VisualizedTrack[];
  initialRange: GenomeRange;
  filters: string[];
};

class Root extends React.Component {
  props: Props;
  state: {
    contigList: string[];
    range: ?GenomeRange;
    settingsMenuKey: ?string;
  };

  constructor(props: Object) {
    super(props);
    this.state = {
      contigList: this.props.referenceSource.contigList(),
      range: null,
      settingsMenuKey: null
    };
  }

  componentDidMount() {
    this.props.referenceSource.on('contigs', () => {
      this.setState({
        contigList: this.props.referenceSource.contigList(),
      });
    });

    if (!this.state.range) {
      this.handleRangeChange(this.props.initialRange);
    }
    // in case the contigs came in between getInitialState() and here.
    this.setState({contigList: this.props.referenceSource.contigList()});
  }

  handleRangeChange(newRange: GenomeRange) {
    // Do not propagate negative ranges
    if (newRange.start < 0) {
      newRange.start = 0;
    }
    this.props.referenceSource.normalizeRange(newRange).then(range => {
      this.setState({range: range});

      // Inform all the sources of the range change (including referenceSource).
      this.props.tracks.forEach(track => {
        track.source.rangeChanged(range);
      });
    }).done();
  }

  handleVariantFilterChange(vcfFilter: VcfFilter) {
    // filter tracks
    var filteredTracks =
      this.props.tracks.filter(t => t.track.viz.component.displayName == VariantTrack.displayName);

    filteredTracks.forEach(track => {
      track.source.filterChanged();
    });
  }

  toggleSettingsMenu(key: string, e: SyntheticEvent) {
    if (this.state.settingsMenuKey == key) {
      this.setState({settingsMenuKey: null});
    } else {
      this.setState({settingsMenuKey: key});
    }
  }

  handleSelectOption(trackKey: string, optionKey: string) {
    this.setState({settingsMenuKey: null});

    var viz = this.props.tracks[Number(trackKey)].visualization;
    var oldOpts = viz.options;
    var newOpts = viz.component.handleSelectOption(optionKey, oldOpts);
    viz.options = newOpts;
    if (newOpts != oldOpts) {
      this.forceUpdate();
    }
  }

  makeDivForTrack(key: string, track: VisualizedTrack): React.Element {
    var trackEl = (
        <VisualizationWrapper visualization={track.visualization}
            range={this.state.range}
            onRangeChange={this.handleRangeChange.bind(this)}
            source={track.source}
            referenceSource={this.props.referenceSource}
          />);

    var trackName = track.track.name || '(track name)';

    var gearIcon = null,
        settingsMenu = null;
    if (track.visualization.component.getOptionsMenu) {
      gearIcon = (
          <span ref={'gear-' + key}
                className='gear'
                onClick={this.toggleSettingsMenu.bind(this, key)}>
            ⚙
          </span>
      );
    }

    if (this.state.settingsMenuKey == key) {
      var gear = this.refs['gear-' + key],
          gearX = gear.offsetLeft,
          gearW = gear.offsetWidth,
          gearY = gear.offsetTop;

      var menuStyle = {
        position: 'absolute',
        left: (gearX + gearW) + 'px',
        top: gearY + 'px'
      };
      var items = track.visualization.component.getOptionsMenu(track.visualization.options);
      settingsMenu = (
        <div className='menu-container' style={menuStyle}>
          <Menu header={trackName} items={items} onSelect={this.handleSelectOption.bind(this, key)} />
        </div>
      );
    }

    var className = ['track', track.visualization.component.displayName || '', track.track.cssClass || ''].join(' ');

    return (
      <div key={key} className={className}>
        <div className='track-label'>
          <span>{trackName}</span>
          <br/>
          {gearIcon}
          {settingsMenu}
        </div>
        <div className='track-content'>
          {trackEl}
        </div>
      </div>
    );
  }

  render(): any {
    // push filters that were specified
    var filters = [];
    if (this.props.filters.filter(f => f == VariantTrack.displayName).length > 0)
      filters.push(<VariantFilter filters={filterUtils.initVariantFilters()}
                            onChange={this.handleVariantFilterChange.bind(this)} />);

    // TODO: use a better key than index.
    var trackEls = this.props.tracks.map((t, i) => this.makeDivForTrack(''+i, t));
    return (
      <div className='pileup-root'>
        <div className='track controls'>
          <div className='track-label'>
            &nbsp;
          </div>
          <div className='track-content'>
            <Controls contigList={this.state.contigList}
                      range={this.state.range}
                      onChange={this.handleRangeChange.bind(this)} />
          </div>
        </div>
        {trackEls}
        <script src="bigSlide.js"></script>
        <nav id="menu" class="panel" role="navigation">
          {filters}
        </nav>
      </div>

    );
  }
}
Root.displayName = 'Root';

module.exports = Root;
