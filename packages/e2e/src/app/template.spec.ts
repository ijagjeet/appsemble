const base = `https://${process.env.CI_MERGE_REQUEST_IID || 'staging'}.appsemble.review`;
const { host, protocol } = new URL(base);

describe('Template app screenshots', () => {
  const templates: string[] = Cypress.env('templates');

  for (const template of templates) {
    it(`${template}: Should match a screenshot in desktop mode`, () => {
      const url = `${protocol}//${template}.appsemble.${host}`;
      cy.visit(url);
      cy.mockGeolocation();
    });
  }
});
