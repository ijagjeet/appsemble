import concat from 'concat-stream';
import path from 'path';

import makePayload from './makePayload';

it('should create a form-data payload', async () => {
  const payload = await makePayload({
    webpack: 'webpack.config',
    name: '@org/block',
    output: 'output',
    version: '1.2.3',
    dir: path.join(__dirname, '__fixtures__', 'makePayload', 'no-icon'),
    parameters: { type: 'object' },
    actions: { onClick: {} },
    events: { listen: [] },
  });
  const boundary = payload.getBoundary();
  const buffer = await new Promise((resolve) => {
    payload.pipe(concat(resolve));
  });
  expect(buffer.toString()).toStrictEqual(`--${boundary}\r
Content-Disposition: form-data; name="actions"\r
\r
{"onClick":{}}\r
--${boundary}\r
Content-Disposition: form-data; name="events"\r
\r
{"listen":[]}\r
--${boundary}\r
Content-Disposition: form-data; name="name"\r
\r
@org/block\r
--${boundary}\r
Content-Disposition: form-data; name="parameters"\r
\r
{"type":"object"}\r
--${boundary}\r
Content-Disposition: form-data; name="version"\r
\r
1.2.3\r
--${boundary}\r
Content-Disposition: form-data; name="files"; filename="block.js"\r
Content-Type: application/javascript\r
\r
export default 'no-icon';
\r
--${boundary}--\r
`);
});

it('should include an icon if one is present', async () => {
  const payload = await makePayload({
    webpack: 'webpack.config',
    name: '@org/block',
    output: 'output',
    version: '1.2.3',
    dir: path.join(__dirname, '__fixtures__', 'makePayload', 'with-icon'),
    parameters: {},
    actions: {},
    events: {},
  });
  const boundary = payload.getBoundary();
  const buffer = await new Promise((resolve) => {
    payload.pipe(concat(resolve));
  });
  expect(buffer.toString()).toStrictEqual(`--${boundary}\r
Content-Disposition: form-data; name="actions"\r
\r
{}\r
--${boundary}\r
Content-Disposition: form-data; name="events"\r
\r
{}\r
--${boundary}\r
Content-Disposition: form-data; name="name"\r
\r
@org/block\r
--${boundary}\r
Content-Disposition: form-data; name="parameters"\r
\r
{}\r
--${boundary}\r
Content-Disposition: form-data; name="version"\r
\r
1.2.3\r
--${boundary}\r
Content-Disposition: form-data; name="icon"; filename="icon.svg"\r
Content-Type: image/svg+xml\r
\r
<?xml version="1.0" standalone="no"?>
<svg />
\r
--${boundary}\r
Content-Disposition: form-data; name="files"; filename="block.js"\r
Content-Type: application/javascript\r
\r
export default 'with-icon';
\r
--${boundary}--\r
`);
});
