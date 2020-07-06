import { useBlock } from '@appsemble/preact';
import { Location } from '@appsemble/preact-components';
import type { DivIcon, Icon } from 'leaflet';
import { h, VNode } from 'preact';
import { useEffect, useState } from 'preact/hooks';

import iconUrl from '../../../../../themes/amsterdam/core/marker.svg';
import type { GeoCoordinatesField, RendererProps } from '../../../block';
import createIcon from '../utils/createIcon';
import styles from './index.css';

/**
 * An map for an object type schema which implements GeoCoordinates.
 *
 * https://schema.org/GeoCoordinates
 */
export default function GeoCoordinatesRenderer({
  data,
  field,
  theme,
}: RendererProps<GeoCoordinatesField>): VNode {
  const block = useBlock();
  const {
    parameters: { icons },
    utils,
  } = block;

  const label = utils.remap(field.label, data);
  const value = utils.remap(field.name, data);
  const lat = field.latitude ? utils.remap(field.latitude, value ?? data) : value.lat;
  const lng = field.longitude ? utils.remap(field.longitude, value ?? data) : value.lng;
  const [marker, setMarker] = useState<Icon | DivIcon>(null);

  useEffect(() => {
    if (icons) {
      createIcon(block).then(setMarker);
    }
  }, [block, icons]);

  return (
    <div className={styles.root}>
      {label && <h1 className="label">{label}</h1>}

      {((icons && marker) || !icons) && (
        <Location
          className={styles.map}
          iconHeight={40}
          iconUrl={iconUrl}
          iconWidth={40}
          latitude={lat}
          longitude={lng}
          marker={marker}
          theme={theme}
        />
      )}
    </div>
  );
}
