import { Navbar, NavbarBrand, NavbarItem, Button } from '@appsemble/react-bulma';
import axios from 'axios';
import { Link } from 'react-router-dom';
import MonacoEditor from 'react-monaco-editor';
import PropTypes from 'prop-types';
import React from 'react';
import yaml from 'js-yaml';

import styles from './editor.css';

export default class Editor extends React.Component {
  static propTypes = {
    id: PropTypes.string.isRequired,
  };

  state = {
    recipe: '',
    valid: false,
    dirty: true,
    icon: undefined,
  };

  frame = React.createRef();

  async componentDidMount() {
    const { id } = this.props;
    const { data } = await axios.get(`/api/apps/${id}`);
    const recipe = yaml.safeDump(data);

    this.setState({ recipe, path: data.path });
  }

  onSubmit = event => {
    event.preventDefault();

    this.setState(({ recipe }) => {
      let app = null;

      // Attempt to parse the YAML into a JSON object
      try {
        app = yaml.safeLoad(recipe);
      } catch (e) {
        return { valid: false, dirty: false };
      }

      // YAML appears to be valid, send it to the app preview iframe
      this.frame.current.contentWindow.postMessage(
        { type: 'editor/EDIT_SUCCESS', app },
        window.location.origin,
      );

      return { valid: true, dirty: false };
    });
  };

  onUpload = async () => {
    const { id } = this.props;
    const { recipe, valid, icon } = this.state;

    if (valid) {
      await axios.put(`/api/apps/${id}`, yaml.safeLoad(recipe));
    }

    if (icon) {
      await axios.post(`/api/apps/${id}/icon`, icon, {
        headers: { 'Content-Type': icon.type },
      });
    }

    this.setState({ dirty: true });
  };

  onMonacoChange = recipe => {
    this.setState({ recipe, dirty: true });
  };

  onIconChange = e => {
    this.setState({ icon: e.target.files[0], dirty: true });
  };

  render() {
    const { recipe, path, valid, dirty, icon } = this.state;
    const { id } = this.props;
    const filename = icon ? icon.name : 'Icon';

    return (
      <div className={styles.editor}>
        <div className={styles.leftPanel}>
          <form className={styles.editorForm} onSubmit={this.onSubmit}>
            <Navbar className="is-dark">
              <NavbarBrand>
                <NavbarItem>
                  <Link className={styles.title} to="/editor">
                    Editor
                  </Link>
                </NavbarItem>
                <NavbarItem>
                  <Button disabled={!dirty} type="submit">
                    Save
                  </Button>
                </NavbarItem>
                <NavbarItem>
                  <Button disabled={!valid || dirty} onClick={this.onUpload}>
                    Upload
                  </Button>
                </NavbarItem>
                <NavbarItem>
                  <div className={`file ${icon && 'has-name'}`}>
                    <label className="file-label" htmlFor="icon-upload">
                      <input
                        accept="image/jpeg, image/png, image/tiff, image/webp, image/xml+svg"
                        className="file-input"
                        id="icon-upload"
                        name="icon"
                        onChange={this.onIconChange}
                        type="file"
                      />
                      <span className="file-cta">
                        <span className="file-icon">
                          <i className="fas fa-upload" />
                        </span>
                        <span className="file-label">Icon</span>
                      </span>
                      {icon && <span className="file-name">{filename}</span>}
                    </label>
                  </div>
                </NavbarItem>
              </NavbarBrand>
            </Navbar>
            <MonacoEditor
              className={styles.monacoEditor}
              language="yaml"
              onChange={this.onMonacoChange}
              options={{ tabSize: 2, minimap: { enabled: false } }}
              theme="vs"
              value={recipe}
            />
          </form>
        </div>

        <div className={styles.rightPanel}>
          {id &&
            path && (
              <iframe
                ref={this.frame}
                className={styles.appFrame}
                src={`/${path}`}
                title="Appsemble App Preview"
              />
            )}
        </div>
      </div>
    );
  }
}
