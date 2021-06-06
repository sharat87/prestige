# Prestige <sup>&alpha;</sup> <img align=right src="https://img.shields.io/badge/Made_With-Boring_Tech-F09?style=for-the-badge">

**Just an HTTP client, by [@sharat87](https://sharats.me). Available at [prestigemad.com](https://prestigemad.com)
([Why that domain?](#why-the-domain)).**

> Under the abstractions, it's all just stardust interacting with text.

This is a *powerful*, *text-based*, *in-browser*, HTTP client app that I wanted for myself and wished someone would
build it one day. Well, had to do it myself in the end.

Check out the [User Guide](https://prestigemad.com/docs) to learn how Prestige can be a powerful addition to your
toolset.

**Why is Prestige labeled as Alpha Software?**: Two reasons. One, the primary experiences and documented features are
not yet very stable. Two, the syntax and API are not final yet.

## Under the Hood

Note that today, this is a hobby side-project, with a ton of inefficient code and features just rich enough for my daily
work to get by. It is particularly lacking in test cases, but a test framework and a test running infrastructure is
there (so that's a good place to contribute if you want to get started). However, I use Prestige all day, every day at
my job, and it's fairly stable in that. When I find something lacking/breaking, I tend to either immediately fix it (if
it's a small thing) or defer it to a weekend. All this said, Prestige should be considered alpha software. I'll change
the status to beta once there's better test coverage and documentation.

Prestige exists thanks to the work of the following open source projects (not exhaustive, thanks to all those who
weren't listed here, but still were just as helpful):

1. [Mithril](https://mithril.js.org/) &mdash; powers the code structure and provides a scaffolding for the interactivity.
1. [CodeMirror](https://codemirror.net/) &mdash; powers the code editor and syntax-highlighted code blocks.
1. [TypeScript](https://www.typescriptlang.org/) &mdash; powers the script compilation and static checking within Parcel.
1. [Django](https://www.djangoproject.com/) &mdash; powers the backend infrastructure including cloud storage, proxy etc.
1. [Python](https://www.python.org/) &mdash; powers the backend and end-to-end tests.
1. [Tachyons](http://tachyons.io/) &mdash; powers the styling and theming infrastructure.
1. [Parcel](https://parceljs.org/) &mdash; powers the building and bundling of application assets for deployment.
1. [Selenium](https://www.selenium.dev/) &mdash; powers the end-to-end testing workflow.
1. [MkDocs](https://www.mkdocs.org/) &mdash; powers the documentation site.

A big thank you to all folks who put in their time and sweat for these projects to exist as open source!

## Developing

Please ensure you have Node >= v12 (with yarn) and Python >= v3.7 (with pip) before trying the following commands.

The project contains a powerful makefile that makes getting started with development quite easy. Here's a quick summary
of some of the targets:

1. `make serve-frontend` &mdash; Starts a server for the frontend at port 3040.
	Note: Please go to <http://localhost:3040/index.html>, since <http://localhost:3040/> doesn't work for some reason.
1. `make serve-backend` &mdash; Starts a server for the backend at port 3041.
1. `make serve-docs` &mdash; Starts a server for the documentation site at 3042.
1. `make test-*` &mdash; Test frontend/backend/e2e (depending on what's in place of `*`).

## Inspirations

- HTTP Client for Sublime Text: [Requester](https://github.com/kylebebak/Requester).
- HTTP Client for VS Code: [vscode-restclient](https://github.com/Huachao/vscode-restclient).
- REST Client for IntelliJ based IDEs: [JetBrains HTTP Client](https://www.jetbrains.com/help/idea/http-client-in-product-code-editor.html).
- My own Vim extension towards a very similar concept: [roast.vim](https://github.com/sharat87/roast.vim).

More: <https://github.com/marmelab/awesome-rest>.

## Some public APIs to play with

1. [httpbun.com](https://httpbun.com) &mdash; Great for meta-testing and JSON/form-data related experiments.
1. [A collective list of free APIs for use in software and web development](https://github.com/public-apis/public-apis).
1. Yahoo Finance stock prices API &mdash; Great for large text responses and CSV data.
1. GitHub GraphQL API &mdash; Great for experimenting with GraphQL, but requires a personal auth token.
1. [A Curated List of 100 Cool and Fun Public APIs to Inspire Your Next Project](https://medium.com/better-programming/a-curated-list-of-100-cool-and-fun-public-apis-to-inspire-your-next-project-7600ce3e9b3)

## Rough Roadmap

- UI Tests?
- User Guide and User API Reference.
- A desktop app with <https://github.com/webview/webview> or something similar.
- A browser extension that, when installed, would make it so that we don't need the proxy anymore.
- Dockerfiles and ability to start client and server with a single `docker-compose` command.
- Response handler scripts.
- Ability to open/edit documents from GitHub, Google Drive and Dropbox.
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

[Apache-2.0](blob/master/LICENSE). Project includes a [NOTICE](blob/master/NOTICE) file.
