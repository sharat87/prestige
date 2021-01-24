# Introduction

> Just an HTTP Client, by Shrikant.

Prestige is a text-based HTTP client, intended for use as an API development tool. In some ways, it is similar to
[Postman](https://postman.co) or [Insomnia](https://insomnia.rest), but with a more UI-less design. This translates to
being highly flexible. For starters, there's no input boxes for URLs, drop-downs for methods etc. All that UI is done
away with. Instead, the interface looks like a traditional text editor and the requests are to be written as plain text.

For example, the following a POST request with details that should be self-explanatory.

```http
POST http://my-awesome-api.com/users
Content-Type: application/json

{
  "name": "Byomkesh Bakshi",
  "occupation": "Detective",
  "city": "Kolkata"
}
```

This might seem less powerful compared to a fancy UI based tool, but since it's just text, it's extremely malleable.
Prestige provides tools like templating, Javascript powered post body generation, pre-execution callbacks etc., that
power you to play with APIs at new speeds.

This document is the definitive user guide for Prestige. If you have questions, suggestions, or bug reports to make,
GitHub Issues is currently the best place to do so. Thank you for trying out Prestige, I hope you like it!

There's three primary things to know to get started with 80% of what Prestige can offer.

## 1. Running Basic Requests

Requests in Prestige should be written similar to how requests look like in the HTTP protocol. That is, they are
primarily made of two sections. The first section contains the HTTP method, the URL and optionally, any custom headers.
The second section, which is optional, contains the request body.

First off, let's look at a very simple GET request:

```http
GET http://httpbin.org/get?first=Sherlock&last=Holmes
```

Here, we're executing a GET request to the URL <http://httpbin.org/get?first=Sherlock&last=Holmes>. Copy this line over
to a document in the Prestige app, place your cursor on it and hit <kbd>Ctrl+Enter</kbd>. The GET request will be
executed, and the response details will show on the right.

Multiple requests should be separated by a line that starts with `###`. Such lines mark the end of a request and start
of the definition of a new request. For example, we define two different GET requests below:

```http

GET http://httpbin.org/get?just_first=Sherlock

###

GET http://httpbin.org/get?just_last=Holmes

```

If we place our cursor on the first GET line and hit `Ctrl+Enter`, the first one would be executed. Similarly for the
second request. The request that gets executed depends on where the cursor is *when the hotkey is invoked*.

As mentioned earlier, a second section can be added for passing request body. Let's execute a simple POST request with a
JSON body:

```http
POST http://httpbin.org/post
Content-Type: application/json

{
  "first": "Sherlock",
  "last": "Holmes"
}
```

There's three things to note here:

1. We've set a `Content-Type` header right below the POST line, to specify that the body is JSON.
1. The headers section, and the body section are separated by a *single* blank line.
1. The cursor can be placed anywhere within the POST line and the last line of the POST body (*i.e.,* the `}` line),
   to execute this request.

Copy this over to a sheet in Prestige and hit `Ctrl-Enter` to execute this POST request. The response should show up
in the right.

Learn more about the syntax of defining requests in Prestige at the [Syntax Guide](guides/syntax.md).

## 2. Javascript Blocks

Javascript blocks are, well, blocks made up of Javascript. Javascript blocks begin with the line `### javascript` and
end with either a `###` or another `### javascript`.

Inserting a Javascript block in a Prestige document, works very similar to inserting a `<script>` tag in an HTML
document. However, only the Javascript blocks *above* the request being executed, are evaluated. This will make more
sense as we go over some examples.

Consider the following, where we have one Javascript block, and one GET request:

```
### javascript

alert("in js block")

###

GET http://httpbin.org/get
```

If we put the cursor on the last line and hit `Ctrl+Enter`, we will see the alert message popup, and the request will
be executed only *after* we close the alert message.

Javascript blocks can be used for simple templating (explained in following section), or for more advanced scripting
that can customize the way Prestige executes requests. Learn more at the [Javascript Blocks
Guide](guides/javascript-blocks.md).

## 3. Templating

Templating illustrates the power of plain text. This is best explained with an example:

```
### javascript

this.data.firstName = "Sherlock"
this.data.lastName = "Holmes"

###

GET http://httpbin.org/get?first=${firstName}&last=${lastName}
```

Here, when we place the cursor on the GET line and hit `Ctrl+Enter`, Prestige first evaluates the Javascript block, and
then renders the GET request line as if it's a [template string][], with values from `this.data` in scope. So, the
request that actually gets executed is the following:

[template string]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals

```
GET http://httpbin.org/get?first=Sherlock&last=Holmes
```

That seems simple enough. But, template interpolations (the `${}` thingies) work not just in the query params, it's in
the whole thing! Method? Check. URL? Check. *Headers*? Check. Here's a slightly crazy example:

```
### javascript

this.data.userPostRequest = "POST http://httpbin.org/post\n" +
    "Content-Type: application/javascript"

###

${ userPostRequest }

{
  "first": "Sherlock",
  "last": "Holmes"
}
```

Guess what that does?

When I implemented this feature, I didn't expect it to be as useful as it turned out to be for me. Here's another
example of how I started using it. Since the interpolations are just Javascript template strings, any valid expression
can be placed inside `${}`.

```
### javascript

this.data.nameRequest = (first, last) => {
    "GET http://httpbin.org/get?first=" + first + "&last=" + last
}

###

${ nameRequest("Sherlock", "Holmes") }

###

${ nameRequest("Isaac", "Asimov") }

```

All this is totally valid, extremely powerful, but most important of all, still easy to read and reason with!

Learn more about templating in the request details and using expressions in the request body (which behaves slightly
differently) at the [Templating Guide](guides/templating.md).

## Lots More

That's to get started with Prestige. I encourage you to play around and try out Prestige armed with the knowledge from
this page. When you're ready to know more, head over to the guides from top menu.
