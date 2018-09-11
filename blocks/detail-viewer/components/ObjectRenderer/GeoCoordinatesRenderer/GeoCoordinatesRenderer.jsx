import 'leaflet/dist/leaflet.css';
import PropTypes from 'prop-types';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import { Point } from 'leaflet/src/geometry';
import { Icon, Marker, TileLayer } from 'leaflet/src/layer';
import { Map } from 'leaflet/src/map';
import React from 'react';

import Definition from '../../Definition';
import styles from './GeoCoordinatesRenderer.css';


const MARKER_ICON_WIDTH = 25;
const MARKER_ICON_HEIGHT = 41;


/**
 * An map for an object type schema which implements GeoCoordinates.
 *
 * https://schema.org/GeoCoordinates
 */
export default class GeoCoordinatesRenderer extends React.Component {
  static propTypes = {
    /**
     * The current value.
     */
    value: PropTypes.shape(),
  };

  static defaultProps = {
    value: {},
  };

  ref = React.createRef();

  componentDidMount() {
    const {
      value,
    } = this.props;

    const map = new Map(this.ref.current, { attributionControl: false })
      .setView([value.latitude, value.longitude], 16);
    new TileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    new Marker(null, {
      icon: new Icon({
        iconUrl,
        iconRetinaUrl,
        iconAnchor: new Point(MARKER_ICON_WIDTH / 2, MARKER_ICON_HEIGHT),
        shadowUrl,
      }),
    }).setLatLng([value.latitude, value.longitude]).addTo(map);
  }

  render() {
    return (
      <Definition {...this.props}>
        <div className={styles.root} ref={this.ref} />
      </Definition>
    );
  }
}
