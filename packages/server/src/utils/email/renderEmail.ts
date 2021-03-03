import yaml from 'js-yaml';
// eslint-disable-next-line import/no-extraneous-dependencies
import { InlineCode, Link, Parent } from 'mdast';
import rehypeDocument from 'rehype-document';
import rehypeStringify from 'rehype-stringify';
import frontmatter, { YamlNode } from 'remark-frontmatter';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import remarkStringify from 'remark-stringify';
import unified from 'unified';
import visit from 'unist-util-visit';

const remark = unified()
  .use(remarkParse)
  .use(frontmatter)
  .use(remarkStringify, { emphasis: '_' })
  .freeze();

const rehype = unified().use(remarkRehype).use(rehypeDocument).use(rehypeStringify).freeze();

interface Email {
  html: string;
  subject: string;
  text: string;
}

/**
 * Render a markdown email.
 *
 * @param template - The body of the template to render.
 * @param values - Values to pass to the template for rendering.
 * @param sub - The subject of the email to send. If omitted, this is extracted from the markdown
 * email body.
 * @returns An email object that may be sent.
 */
export async function renderEmail(
  template: string,
  values: Record<string, string>,
  sub?: string,
): Promise<Email> {
  let subject = sub;
  const mdast = remark.parse(template);

  function replace(_match: string, key: string): string {
    if (Object.hasOwnProperty.call(values, key)) {
      return values[key];
    }
    throw new Error(`Unknown template value: ${key}`);
  }

  visit<Link>(mdast, 'link', (node) => {
    // eslint-disable-next-line no-param-reassign
    node.url = node.url.replace(/\/{{(\w+)}}/, replace);
  });
  visit<InlineCode>(mdast, 'inlineCode', (node, index, parent: Parent) => {
    parent.children.splice(index, 1, {
      type: 'text',
      value: node.value.replace(/{{(\w+)}}/, replace),
    });
  });

  if (!sub) {
    visit<YamlNode>(mdast, 'yaml', (node, index, parent: Parent) => {
      ({ subject } = yaml.safeLoad(node.value) as Email);
      parent.children.splice(index, 1);
    });
  }

  const text = remark.stringify(mdast);
  const hast = await rehype.run(mdast, { stem: subject });
  const html = rehype.stringify(hast);
  return { html, subject, text };
}
