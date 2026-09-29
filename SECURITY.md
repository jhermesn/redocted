# Security policy

Redocted is a static site: no accounts, no server, and game progress stays in
the player's browser. Please report privately:

- a way to run script or inject markup in the page, for example through an
  article, a guess, a URL parameter or data in `localStorage`;
- a way for the corpus builder (`npm run corpus`) to be tricked into writing
  outside `corpus/` or fetching from sites other than the documentation
  sources;
- a compromised or malicious dependency or GitHub Action in this repository.

## How to report

Use GitHub's private vulnerability reporting: **Security → Report a
vulnerability** on this repository. Include the steps or input that reproduce
the problem. Please do not open a public issue for these.

Ordinary bugs go in a regular issue.
