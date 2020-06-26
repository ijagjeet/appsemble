import { applyRefs } from '@appsemble/react-components';
import { editor, KeyCode, KeyMod, Range } from 'monaco-editor';
import * as React from 'react';
import ResizeObserver from 'resize-observer-polyfill';

import styles from './index.css';

editor.setTheme('vs');

type Options = editor.IEditorOptions & editor.IGlobalEditorOptions;

interface MonacoEditorProps {
  /**
   * The current value of the editor.
   */
  value?: string;

  /**
   * The language of the editor.
   */
  language: string;

  /**
   * This is called whenever the value of the editor changes.
   *
   * @param event The monaco change event.
   * @param value The new value.
   */
  onChange?: (event: editor.IModelContentChangedEvent, value: string) => void;

  /**
   * Called when Ctrl-S is pressed.
   */
  onSave?: () => void;

  /**
   * Editor options to set.
   */
  options?: Options;

  /**
   * Save decorations even when editor is disposed
   */
  decorationList?: string[];
  onChangeDecorationList?: (value: string[]) => void;
}

const defaultOptions: Options = {};

const emptyDecoration: editor.IModelDeltaDecoration[] = [
  {
    range: new Range(0, 0, 0, 0),
    options: {},
  },
];

/**
 * Render a Monaco standalone editor instance.
 *
 * The forwarded ref might not trigger a rerender of the parent component. Instead of passing a ref
 * object, it is recommended to use a state setter function.
 */
export default React.forwardRef<editor.IStandaloneCodeEditor, MonacoEditorProps>(
  (
    {
      language,
      onChange,
      decorationList,
      onChangeDecorationList,
      onSave,
      options = defaultOptions,
      value = '',
    },
    ref,
  ) => {
    const [monaco, setMonaco] = React.useState<editor.IStandaloneCodeEditor>();

    const saveRef = React.useRef(onSave);
    saveRef.current = onSave;

    const nodeRef = React.useCallback((node: HTMLDivElement) => {
      if (!node) {
        return () => {
          applyRefs(null, ref);
        };
      }

      const ed = editor.create(node, options);
      // eslint-disable-next-line no-bitwise
      ed.addCommand(KeyMod.CtrlCmd | KeyCode.KEY_S, () => saveRef.current?.());

      const observer = new ResizeObserver(() => ed.layout());
      observer.observe(node);

      applyRefs(ed, setMonaco, ref);

      return () => {
        ed.dispose();
        observer.unobserve(node);
        applyRefs(null, ref);
      };
      // This is triggered by the lack of options in the dependency array. This is left out on
      // purpose. Instead, this is handled using monaco.updateOptions() below.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    React.useEffect(() => {
      if (monaco) {
        monaco.updateOptions(options);

        if (decorationList && onChangeDecorationList) {
          onChangeDecorationList(
            monaco.getModel().deltaDecorations(decorationList, emptyDecoration),
          );
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [monaco, options]);

    React.useEffect(() => {
      if (monaco) {
        editor.setModelLanguage(monaco.getModel(), language);
      }
    }, [language, monaco]);

    React.useEffect(() => {
      if (monaco && monaco.getModel().getValue() !== value) {
        monaco.getModel().setValue(value);
      }
    }, [monaco, value]);

    React.useEffect(() => {
      if (!monaco || !onChange) {
        return undefined;
      }
      const model = monaco.getModel();
      const subscription = model.onDidChangeContent((event) => onChange(event, model.getValue()));

      return () => subscription.dispose();
    }, [monaco, onChange]);

    return <div ref={nodeRef} className={styles.editor} />;
  },
);
