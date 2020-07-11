# Prestige *<sup>&alpha; alpha</sup>*

An HTTP client, by Shrikant. Available at [prestigemad.com](https://prestigemad.com)
([Why that domain?](#why-the-domain)).

This is a *simple*, *text-based*, *in-browser*, HTTP client app that I wanted for myself and wished someone would build
it one day. Well, had to do it myself in the end.

## Under the Hood

Note that this is a sad, but working implementation of the idea, carrying a metric tonne of tech debt and shamefully
inefficient code. It is particularly lacking in test cases, but a test framework and a test running infrastructure is
there (so that's a good place to contribute if you want to get started). However, I use Prestige all day every day at my
job, and it's fairly stable. When I find something lacking/breaking, I tend to either immediately fix it or defer it to
EOD. All this said, Prestige should be considered alpha software. I'll change the status to beta once there's better
test coverage.

Prestige exists thanks to the work of the following open source projects (not exhaustive, thanks to all those who
weren't listed here, but still were just as helpful):

1. [Mithril](https://mithril.js.org/) --- powers the code structure and provides a scaffolding for the interactivity.
1. [Parcel](https://parceljs.org/) --- powers the building and bundling of application assets for deployment.
1. [TypeScript](https://www.typescriptlang.org/) --- powers the script compilation pipeline behind Parcel.
1. [CodeMirror](https://codemirror.net/) --- powers the code editor.
1. [Prism](https://prismjs.com/) --- powers the syntax highlighting in the results pane.
1. [Mustache](https://mustache.github.io/) --- powers the templating.
1. [MsgPack](https://msgpack.org/index.html) --- powers the protocol for communication with the proxy server.

A big thank you to all folks who put in their time and sweat for these projects to exist as open source!

## Developing

For development, use the following command to start a development server on port 3040:

    npm start

Once this is running, the app can be accessed at <http://localhost:3040/index.html> and the help document can be
accessed at <http://localhost:3040/help.html>. Note that just <http://localhost:3040> doesn't currently work, we have to
explicitly specify the `index.html` file.

## Inspirations

- HTTP Client for Sublime Text: <https://requester.org/>.
- HTTP Client for VS Code: <https://github.com/Huachao/vscode-restclient>.
- REST Client for IntelliJ based IDEs: <https://www.jetbrains.com/help/idea/http-client-in-product-code-editor.html>.

More: <https://github.com/marmelab/awesome-rest>.

Selectable sessions support like <https://httpie.org/>?

TODO: Also support using <https://cors-anywhere.herokuapp.com/> as a proxy?

## Rough Roadmap

- Tests (at least for syntax parsing).
- A desktop app with <https://github.com/webview/webview> or something similar.
- Ability to start client and server with a single `docker-compose` command.
- Javascript syntax highlighting.
- Create a rough SVG Logo.

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

And so we have [prestigemad.com](https://prestigemad.com).
