import { editor } from 'monaco-editor/esm/vs/editor/editor.api';
import { ReactElement, useCallback } from 'react';
import { Icon } from 'react-components/src/Icon';

import styles from './index.module.css';

interface DiagnosticProps {
  /**
   * The diagnostic marker to render.
   */
  marker: editor.IMarker;

  /**
   * The Monaco editor instance to which the diagnostic applies.
   */
  monaco: editor.IStandaloneCodeEditor;
}

/**
 * Render a clickable Monaco editor diagnostic.
 */
export function Diagnostic({ marker, monaco }: DiagnosticProps): ReactElement {
  const activate = useCallback(() => {
    monaco.setPosition({
      lineNumber: marker.startLineNumber,
      column: marker.startColumn,
    });
    monaco.revealLine(marker.startLineNumber);
    monaco.focus();
  }, [marker, monaco]);

  return (
    <div
      className={styles.root}
      onClick={activate}
      onKeyDown={activate}
      role="button"
      tabIndex={-1}
    >
      <Icon className="has-text-warning mx-1" icon="exclamation-triangle" size="small" />
      {marker.message}
    </div>
  );
}
