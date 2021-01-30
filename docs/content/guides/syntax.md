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
request to `http://httpbin.org/headers` with the two headers listed (in addition to headers sent by default like `Host`
etc.).

!!! note
	There shouldn't be a blank line between the headers or between the URL line and headers. This is because the
	presence of a blank line indicates the content after the blank line makes up for the request body section (described
	under the next heading).

When this request is executed, we can see request headers in the response pane on the right which will show these two
headers as well.

## Body Section

Headers block is a template string

Body block can be any Javascript expression

## Separator Lines

## Custom Headers

We saw how we can set the `Content-Type` header in the previous section, but this can be used to set the values of
most standard or any custom headers. Here's an example:

```http
GET http://httpbin.org/headers
X-My-Awesome-Custom-Header: custom header value here
Another-Header: another header value
Header-Names-Are-Case-Insensitive: but values are case sensitive
```

Some standard headers like `Origin`, `Content-Size`, `Cookie` are set by default and usually don't make sense to
override here.
