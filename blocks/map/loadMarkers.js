import { compileFilters } from '@appsemble/utils/remap';
import { Point } from 'leaflet/src/geometry';
import { Icon, Marker } from 'leaflet/src/layer';
import iconUrl from '../../apps/unlittered/marker.svg';

const MARKER_ICON_WIDTH = 39;
const MARKER_ICON_HEIGHT = 39;

export default async function loadMarkers(map, actions, resources, parameters) {
  const getLatitude =
    parameters.latitude == null ? data => data.latitude : compileFilters(parameters.latitude);
  const getLongitude =
    parameters.longitude == null ? data => data.longitude : compileFilters(parameters.longitude);
  const response = await resources.marker.query();

  response.data.forEach(data => {
    const lat = getLatitude(data);
    const lng = getLongitude(data);
    if (Number.isNaN(Number(lat)) || Number.isNaN(Number(lng))) {
      return;
    }
    new Marker([getLatitude(data), getLongitude(data)], {
      icon: new Icon({
        iconUrl,
        iconAnchor: new Point(MARKER_ICON_WIDTH / 2, MARKER_ICON_HEIGHT),
      }),
    })
      .on('click', actions.markerClick.dispatch.bind(null, data))
      .addTo(map);
  });
}
