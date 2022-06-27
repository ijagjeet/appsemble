import { relative, resolve } from 'path';

import { Link } from 'mdast';
import { Plugin, Transformer } from 'unified';
import visit from 'unist-util-visit';

const transformer: Transformer = (ast, vfile) => {
  visit<Link>(ast, { type: 'link' }, (node) => {
    if (/^(https?:\/)?\//.test(node.url)) {
      // External URLs or absolute URLs to Appsemble Studio
      return;
    }
    const chunks = node.url.split('#');
    if (!chunks[0]) {
      // Internal hash URLs
      return;
    }
    // Resolve the link from the directory containing the file.
    const resolved = resolve(vfile.dirname, chunks[0]);
    // Resolve the path relative to the CWD. This works, because the directory
    // containing the docs and the URL prefix are the same. Otherwise, this would
    // need to be replaced as well.
    const rel = relative(vfile.cwd, resolved);
    // Strip the `.md` extension and `index` filename.
    const stripped = rel.replace(/(\/?index)?\.mdx?$/, '');
    // Make the URL absolute, so no weird routing happens at runtime.
    const prefixed = `/${stripped}`;
    chunks[0] = prefixed;
    // Update the node URL, taking the URL hash into account.
    // eslint-disable-next-line no-param-reassign
    node.url = chunks.join('#');
  });
};

/**
 * This remark plugin rewrites links to they can be resolved at runtime by Appsemble Studio.
 */
export const remarkRewriteLinks: Plugin = () => transformer;
