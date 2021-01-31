# Syntax

This document describes the syntax structure that Prestige understands to execute requests.

## Basic Syntax

The syntax of an HTTP request has two major sections. The headers section, followed by the body section. These two
sections are expected to be separated by a single blank line. Additionally, the body section is optional. We'll discuss
these two sections in the following... sections in this document.

**Comments** can be written by preceding lines with a `#`. Note that such comments are only allowed in the header
section. Any such comments in the body section, will be treated as part of the request body and will be sent as part of
the request (except lines starting with `###`, see next paragraph).

Lines starting with a `###` mark the end of an HTTP request and the beginning of another. Lines with just `###` can be
used as separator lines between multiple HTTP requests. The position of the cursor when hitting <kbd>Ctrl+Enter</kbd>
decides which request should run.

## Header Section

The header section contains the request method (`GET`, `POST`, `PUT` etc.) and the full absolute URL (_e.g._,
`http://httpbin.org/get`), in the first line and then followed by any optional custom headers, one per line.

Here's an example of a simple GET request without any custom headers:

```http
GET http://httpbin.org/get
```

This is a full valid request. Hitting `Ctrl+Enter` while the cursor is on this line will execute a `GET` request to the
URL `http://httpbin.org/get`. Any query parameters can be appended to the URL in their standard form. Here's an example:

```http
GET http://httpbin.org/get?first=Sherlock&last=Holmes
```

The method here is not case-sensitive. Writing `GET` and `get` behave exactly the same.

!!! note
	Currently there is no way to split long URLs into multiple lines, so the URL, however long should be in this line
	only.

Right below this line, we can add any headers to be sent to the request. For example:

```http
GET http://httpbin.org/headers
X-My-Name: is not Sherlock
X-From: an awesome HTTP playground tool
```

To run this request, we can hit <kbd>Ctrl+Enter</kbd> with cursor on any of these lines. Prestige will execute a `GET`
request to `http://httpbin.org/headers` with the two headers listed (in addition to headers sent by default like
`Content-Size` etc.).

!!! note
	There shouldn't be a blank line between the headers or between the URL line and headers. This is because the
	presence of a blank line indicates the content after the blank line makes up for the request body section (described
	under the next heading).

When this request is executed, we can see the request headers in the response pane on the right which will show these
two headers as well.

## Body Section

The body section contains the payload body to be sent along with the HTTP request. This section is optional. If not
provided, no payload will be sent along with the request.

The body section is separated from the headers section by a single blank line. Anything, _anything_ after that single
blank line, will be considered part of the payload. Even lines starting with a `#` are treated as part of the body, not
as comments. The end of the body is marked either by end of the document, or by a line starting with `###`. This
triple-hash marker indicates end of the definition of this request and begins a new one.

Consider the following sheet for example:

```
POST http://httpbin.org/post
Content-Type: application/json

{
  "first": "Chandragupta",
  "last": "Maurya"
}

###

GET http://httpbin.org/get?initials=CM
```

Here, we defined two requests, separated by the line containing `###`. The first is a `POST` request that sends a JSON
body (an object with two fields). The second is a `GET` request to a different URL.

Requests can be executed by hitting <kbd>Ctrl+Enter</kbd> while the cursor is in the body block, just as in the headers
block.

## Separator Lines

Separator lines are the lines starting with `###` that mark the end of one request and the start of another. There is
another function that these lines can optionally have. The text following the three hash signs can indicate the type of
content that follows until the next separator line. For example, `### javascript` indicates that everything from the
next line to the next separator line, is to be treated as Javascript. Just `###` without anything after it indicates
that what follows is the definition of an HTTP request. Currently, these are the only two types of blocks supported.

PS: Javascript blocks can be used to define variables (or even functions) that can be used when defining HTTP requests.
Learn more about this in the [templating guide](templating.md).

## Conclusion

That's it. That's all there is to know about Prestige's syntax structures. This topic is deliberately kept simple so
it's not very hard to grok it. There isn't very many rules in the syntax to remember and ponder over when reading
someone else's work.

Additionally, this lends itself to being extremely flexible. Prestige takes Javascript embedded in sheets very seriously
and that provides a lot of power and flexibility to what can be done with even such a simple-looking syntax. A place to
learn about embedding Javascript is the [guide on Javascript blocks](javascript-blocks.md).
