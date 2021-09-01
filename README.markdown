# Prestige <sup>&beta;</sup>

**Just an HTTP client, by [@sharat87](https://sharats.me). Available at [prestigemad.com](https://prestigemad.com)
([Why that domain?](#why-the-domain)).**

> Under all the abstractions, it's just stardust interacting with text.

This is a *powerful*, *text-based*, *in-browser*, HTTP client app that I wanted for myself.

Check out the [User Guide](https://prestigemad.com/docs) to learn how Prestige can be a powerful addition to your
toolset.

**Why is Prestige labeled as Beta Software?**: Gaps in documentation, insufficient test coverage, and potential for
backwards-incompatible changes to the syntax.

[Discuss on Hacker News](https://news.ycombinator.com/item?id=27412445).

## Under the Hood

While Prestige is currently beta, and it does break occasionally, I use Prestige all day, every day at my job, and its
fairly stable in that. When I find something lacking/breaking, I tend to either immediately fix it (if it's a small
thing) or defer it to a weekend.

Prestige exists thanks to the work of the following open source projects (not exhaustive, thanks to all those who
weren't listed here, but still were just as helpful):

1. [TypeScript](https://www.typescriptlang.org/) & [Mithril](https://mithril.js.org/) &mdash; power the frontend UI and logic.
1. [CodeMirror](https://codemirror.net/) &mdash; powers the code editor and syntax-highlighted code blocks.
1. [Less](https://lesscss.org/) & [Tachyons](http://tachyons.io/) &mdash; power the styling and theming systems.
1. [Python](https://www.python.org/) & [Django](https://www.djangoproject.com/) &mdash; power the backend logic.
1. [Python](https://www.python.org/) & [Selenium](https://www.selenium.dev/) &mdash; power the end-to-end testing workflow.
1. [MkDocs](https://www.mkdocs.org/) &mdash; powers the documentation site.
1. [GNU Make]() & [Parcel](https://parceljs.org/) &mdash; power the building and bundling facilities.

A big thank you to all folks who put in their time and sweat for these projects to exist as open source!

## Developing

Please ensure you have Node >= v14 (with yarn) and Python >= v3.8 (with pip) before trying the following commands. I recommend using `asdf-vm` for this, and the project includes a `.tool-versions` file. So, if you have `asdf` already setup, you can just do `asdf install` in this repo and you'll have the correct versions of Node and Python.

The project contains a `makefile` and a `supervisor.conf` file that make getting started with development quite easy. Here's a quick summary:

1. `make start` &mdash; Starts a supervisor daemon, with all servers needed for Prestige to be running.
	All servers are started in dev mode, with auto-reload on, along with a small web UI from supervisor, to monitor the running processes and view their logs.
	See output of `make start` for details.
1. `make stop` &mdash; Stops and shuts down supervisor daemon, along with all the dev processes.
1. `make test-*` &mdash; Test frontend/backend/e2e (depending on what's in place of `*`).
1. `make build-*` &mdash; Build frontend/backend/docs (depending on what's in place of `*`).

## Inspirations

- HTTP Client for Sublime Text: [Requester](https://github.com/kylebebak/Requester).
- HTTP Client for VS Code: [vscode-restclient](https://github.com/Huachao/vscode-restclient).
- REST Client for IntelliJ based IDEs: [JetBrains HTTP Client](https://www.jetbrains.com/help/idea/http-client-in-product-code-editor.html).
- My own Vim extension towards a very similar concept: [roast.vim](https://github.com/sharat87/roast.vim).

More: <https://github.com/marmelab/awesome-rest>.

## Some public APIs to play with

1. [httpbun.com](https://httpbun.com) &mdash; Great for meta-testing and JSON/form-data related experiments. Another
   project by [@sharat87](https://sharats.me).
1. [A collective list of free APIs for use in software and web development](https://github.com/public-apis/public-apis).
1. Yahoo Finance stock prices API &mdash; Great for large text responses and CSV data.
1. GitHub GraphQL API &mdash; Great for experimenting with GraphQL, but requires a personal auth token.
1. [A Curated List of 100 Cool and Fun Public APIs to Inspire Your Next Project](https://medium.com/better-programming/a-curated-list-of-100-cool-and-fun-public-apis-to-inspire-your-next-project-7600ce3e9b3)

## Rough Roadmap

- Close gaps in documentation, finish API Reference and link all mentions of API functions to this page.
- A desktop app with NeutralinoJS.
- A browser extension that, when installed, would make it so that we don't need the proxy anymore.
- Dockerfiles for frontend and backend. Document a way to self-host with a single `docker-compose` command.
- Ability to open/edit documents from GitHub (and Gist), Google Drive and Dropbox.
- Rich editor features like auto-complete, JSON editing help, hotkeys to start new GET/POST/etc. request etc.

## Why the domain?

Well, because finding a decent and reasonable domain name today is precisely mad. Arriving at this domain went something
like this:

> **SO**: Whatcha doin? \
> **Me**: Going mad looking for a domain name for my project. \
> **SO**: Okay. \
> **Me**: I'm just going to pick a mad domain instead. \
> **SO**: Sure. \
> **Me**: I'll just stick mad into the domain name! \
> **SO**: What's for dinner?

Turns out that domain name was indeed available; and so we have [prestigemad.com](https://prestigemad.com).

## Contributing

Contributions (code, tests, docs) are welcome, but if it's even slightly non-trivial or more than a few lines of
changes, I'd appreciate it if you [opened an issue](https://github.com/sharat87/prestige/issues/new) to discuss before
working towards a PR. Among other things, this can help avoid overlaps where we're both working on the same thing, and
we realize it only after you open a PR.

## License

[Apache-2.0](https://github.com/sharat87/prestige/blob/master/LICENSE). Project includes a
[NOTICE](https://github.com/sharat87/prestige/blob/master/NOTICE) file.
