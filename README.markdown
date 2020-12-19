# Prestige <sup>&alpha;</sup>

**Just an HTTP client, by [@sharat87](https://sharats.me). Available at [prestigemad.com](https://prestigemad.com)
([Why that domain?](#why-the-domain)).**

> Under the abstractions, it's all just stardust interacting with text.

This is a *powerful*, *text-based*, *in-browser*, HTTP client app that I wanted for myself and wished someone would
build it one day. Well, had to do it myself in the end.

Check out the [User Guide](https://prestigemad.com/help.html) to learn how Prestige can be a powerful addition to your
toolset.

## Under the Hood

Note that this is a sad, but working implementation of the idea, carrying a metric tonne of tech debt and shamefully
inefficient code. It is particularly lacking in test cases, but a test framework and a test running infrastructure is
there (so that's a good place to contribute if you want to get started). However, I use Prestige all day every day at my
job, and it's fairly stable. When I find something lacking/breaking, I tend to either immediately fix it or defer it to
EOD. All this said, Prestige should be considered alpha software. I'll change the status to beta once there's better
test coverage.

Prestige exists thanks to the work of the following open source projects (not exhaustive, thanks to all those who
weren't listed here, but still were just as helpful):

1. [Mithril](https://mithril.js.org/) &mdash; powers the code structure and provides a scaffolding for the interactivity.
1. [Parcel](https://parceljs.org/) &mdash; powers the building and bundling of application assets for deployment.
1. [TypeScript](https://www.typescriptlang.org/) &mdash; powers the script compilation and static checking within Parcel.
1. [CodeMirror](https://codemirror.net/) &mdash; powers the code editor and syntax-highlighted code blocks.

A big thank you to all folks who put in their time and sweat for these projects to exist as open source!

## Developing

For development, use the following command to start a development server on port 3040 (requires Node v12+):

    make serve-frontend

PS: If you don't have yarn installed, please do an `npm install -g yarn` first.

Once this is running, the app can be accessed at <http://localhost:3040/index.html> and the help document can be
accessed at <http://localhost:3040/help.html>. Note that just <http://localhost:3040> doesn't currently work, we have to
explicitly specify the `index.html` part.

## Inspirations

- HTTP Client for Sublime Text: <https://requester.org/>.
- HTTP Client for VS Code: <https://github.com/Huachao/vscode-restclient>.
- REST Client for IntelliJ based IDEs: <https://www.jetbrains.com/help/idea/http-client-in-product-code-editor.html>.
- My own Vim extension towards a very similar concept: <https://github.com/sharat87/roast.vim>.

More: <https://github.com/marmelab/awesome-rest>.

## Some public APIs play with

1. [A collective list of free APIs for use in software and web development](https://github.com/public-apis/public-apis).
1. [httpbin.org](http://httpbin.org) &mdash; Great for meta-testing and JSON/form-data related experiments.
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
- Starter templates instead of a blank new document.
- Ability to open/edit documents from GitHub, Google Drive and Dropbox.
- Rich editor features like auto-complete, JSON editing help, hotkeys to start new GET/POST/etc. request etc.
- Move to Gulp+Rollup based build system, away from Parcel.

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
