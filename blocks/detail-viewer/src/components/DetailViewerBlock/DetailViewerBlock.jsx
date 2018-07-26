import PropTypes from 'prop-types';
import React from 'react';
import {
  SchemaProvider,
  SchemaRenderer,
} from 'react-schema-renderer';

import BooleanRenderer from '../BooleanRenderer';
import EnumRenderer from '../EnumRenderer';
import ObjectRenderer from '../ObjectRenderer';
import NumberRenderer from '../NumberRenderer';
import StringRenderer from '../StringRenderer';
import styles from './DetailViewerBlock.css';


const schemaOptions = {
  renderers: {
    boolean: BooleanRenderer,
    enum: EnumRenderer,
    integer: NumberRenderer,
    object: ObjectRenderer,
    number: NumberRenderer,
    string: StringRenderer,
  },
};


/**
 * The main component for the Appsemble detail-viewer block.
 */
export default class DetailViewerBlock extends React.Component {
  static propTypes = {
    /**
     * The block as passed by the Appsemble interface.
     */
    block: PropTypes.shape().isRequired,
  };

  render() {
    const {
      block,
    } = this.props;

    return (
      <SchemaProvider value={schemaOptions}>
        <SchemaRenderer
          className={styles.renderer}
          schema={block.parameters.schema}
        />
      </SchemaProvider>
    );
  }
}
