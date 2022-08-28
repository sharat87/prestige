# Prestige

**A text-based HTTP client, by [Shri](https://sharats.me). Available at [prestige.dev](https://prestige.dev).**

> Under all the abstractions, it's just stardust interacting with text.

This is a *powerful*, *text-based*, *in-browser*, HTTP client app geared towards web developers and API testing
professionals.

Check out the [User Guide](https://prestige.dev/docs) to learn how Prestige can be a powerful addition to your toolset.

[Discussion on Hacker News](https://news.ycombinator.com/item?id=27412445). Join us
on [Discord](https://discord.gg/6tc9fMmYRW).

![Prestige light mode screenshot](https://github.com/sharat87/prestige/raw/master/docs/content/img/screenshot-light.png#gh-light-mode-only)
![Prestige dark model screenshot](https://github.com/sharat87/prestige/raw/master/docs/content/img/screenshot-dark.png#gh-dark-mode-only)

If you face any problems or have a suggestion, please [reach out on Discord](https://discord.gg/6tc9fMmYRW),
or [create an issue](https://github.com/sharat87/prestige/issues/new).

## Features

- Define requests in plain text, hit `Ctrl+Enter` (or `Cmd+Enter`) to execute and view results.
- Write plain, familiar Javascript for templating within your requests.
- Shows all responses in a redirect chain, if request redirects.
- Save your Prestige documents to Gist.
- Export requests as cURL commands. Please [open an issue](https://github.com/sharat87/prestige/issues/new) if you'd
  like to see more export formats.
- Isolated cookie management.
- Uploading files to APIs is as simple as drag-dropping the file and calling a function.
- Light and dark modes, for multiple themes.

## Developing

Please ensure you have NodeJS (with yarn) and Go, of versions as specified in
the [`.tool-versions`](https://github.com/sharat87/prestige/blob/master/.tool-versions) file, before trying the
following commands. I recommend using `asdf-vm` for this, which integrates with the `.tool-versions` file. So, if you
have `asdf` already setup, you can just do `asdf install` in this repo, and you'll have the correct versions of NodeJS
and Go.

The project contains a `manage.sh` script that makes development a little easier.

1. `./manage.sh serve-frontend` &mdash; Start frontend Parcel server. This supports full auto-reload.
2. `./manage.sh serve-backend` &mdash; Start backend server. This _doesn't_ auto-reload when code changes.
3. `./manage.sh serve-docs` &mdash; Start docs server. This supports auto-reload only for content pages.
4. `./manage.sh test-*` &mdash; Test frontend/backend/ui (depending on what's in place of `*`).
5. `./manage.sh build-*` &mdash; Build frontend/backend/docs (depending on what's in place of `*`).

Run the serve commands in parallel, then open <http://localhost:3040>.

## Inspirations

- HTTP Client for Sublime Text: [Requester](https://github.com/kylebebak/Requester).
- HTTP Client for VS Code: [vscode-restclient](https://github.com/Huachao/vscode-restclient).
- REST Client for IntelliJ based
  IDEs: [JetBrains HTTP Client](https://www.jetbrains.com/help/idea/http-client-in-product-code-editor.html).
- My own Vim extension towards a very similar concept: [roast.vim](https://github.com/sharat87/roast.vim).

More: <https://github.com/marmelab/awesome-rest>.

## Some public APIs to play with

1. [httpbun.com](https://httpbun.com) &mdash; Great for meta-testing and JSON/form-data related experiments. Another
   project by [@sharat87](https://sharats.me).
2. [A collective list of free APIs for use in software and web development](https://github.com/public-apis/public-apis).
3. Yahoo Finance stock prices API &mdash; Great for large text responses and CSV data.
4. GitHub GraphQL API &mdash; Great for experimenting with GraphQL, but requires a personal auth token.
5. [A Curated List of 100 Cool and Fun Public APIs to Inspire Your Next Project](https://medium.com/better-programming/a-curated-list-of-100-cool-and-fun-public-apis-to-inspire-your-next-project-7600ce3e9b3)
6. [Postman's collection](https://www.postman.com/cs-demo/workspace/public-rest-apis/collection/8854915-454a2dc7-dcbe-41cf-9bfa-da544fcd93a2)

## Rough Roadmap

- Close gaps in documentation, finish API Reference and link all mentions of API functions to this page.
- A desktop app with NeutralinoJS or some other such technology.
- A browser extension that, when installed, would make it so that we don't need the proxy anymore.
- A Dockerfile for quickly running a self-hosted instance of Prestige with Docker.
- Ability to open/edit documents from GitHub repos, Google Drive and Dropbox.
- Rich editor features like auto-complete, JSON editing help, hotkeys to start new GET/POST/etc. request, snippets etc.

## Contributing

Contributions (code, tests, docs) are welcome, but if it's even slightly non-trivial or more than a few lines of
changes, I'd appreciate it if you [opened an issue](https://github.com/sharat87/prestige/issues/new) to discuss before
working towards a PR. Among other things, this can help avoid overlaps where we're both working on the same thing, and
we realize it only after you open a PR.

## License

[Apache-2.0](https://github.com/sharat87/prestige/blob/master/LICENSE). Project includes a
[NOTICE](https://github.com/sharat87/prestige/blob/master/NOTICE) file.
