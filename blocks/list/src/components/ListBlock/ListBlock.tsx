/** @jsx h */
import { BlockProps, FormattedMessage } from '@appsemble/preact';
import { Loader } from '@appsemble/preact-components';
import { h, VNode } from 'preact';
import { useCallback, useEffect, useState } from 'preact/hooks';

import { Actions, Events, Item, Parameters } from '../../../block';
import ListItem from '../ListItem/ListItem';
import styles from './ListBlock.css';

export default function ListBlock({
  actions,
  block: {
    parameters: { fields = [], header },
  },
  events,
  ready,
  utils,
}: BlockProps<Parameters, Actions, Events>): VNode {
  const [data, setData] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadData = useCallback((d: Item[], err: string): void => {
    if (err) {
      setError(true);
    } else {
      setData(d);
      setError(false);
    }
    setLoading(false);
  }, []);

  const onClick = useCallback(
    (d: Item): void => {
      if (actions.onClick) {
        actions.onClick.dispatch(d);
      }
    },
    [actions],
  );

  useEffect(() => {
    events.on.data(loadData);
    ready();
  }, [events, loadData, ready, utils]);

  if (loading) {
    return <Loader />;
  }

  if (error) {
    return <FormattedMessage id="error" />;
  }

  if (!data.length) {
    return <FormattedMessage id="noData" />;
  }

  return (
    <ul className={styles.container}>
      {data.map((item, index) => (
        <li key={item.id ?? index}>
          <ListItem
            actions={actions}
            fields={fields}
            header={header}
            item={item}
            onClick={onClick}
          />
        </li>
      ))}
    </ul>
  );
}
