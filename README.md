# DOI to BibTeX

A static GitHub Pages site that turns lines in this format:

```text
citation-key | doi
```

into formatted BibTeX entries.

## Deploy on GitHub Pages

1. Put `index.html`, `styles.css`, and `app.js` in your repository root.
2. Commit and push the files to GitHub.
3. Open the repository settings.
4. Go to Pages.
5. Set the source to your main branch and `/root`.
6. Save.

The site uses the Crossref API from the browser, so it does not need a backend or build step.
