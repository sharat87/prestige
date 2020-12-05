# Prestige: User Guide

> Just an HTTP Client, by Shrikant.

Prestige is a text-based HTTP client, intended for use as an API development tool. In some ways, it is similar to
[Postman](https://postman.co) or [Insomnia](https://insomnia.rest), but with a more UI-less design. This translates to
being highly flexible. For starters, there's no input boxes for URLs, drop-downs for methods etc. All that UI is done
away with. Instead, the interface looks like a traditional text editor and the requests are to be written as plain text.

For example, the following a POST request with details that should be self-explanatory.

```
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

There's just three things to know to get 90% of what Prestige can offer.

## 1. Running Basic Requests

### GET request

The basic structure of an HTTP request in Prestige is made up of two blocks of content. The first one contains the HTTP
method, the URL and optionally, any custom headers. The second block contains the request body. This block is obviously
optional, and you probably don't want to send it for GET requests.

First off, let's look at a very simple GET request:

```
GET http://httpbin.org/get?first=Sherlock&last=Holmes
```

This is standard HTTP request syntax. We're executing a GET request at the URL
<http://httpbin.org/get?first=Sherlock&last=Holmes>. Copy this over to a document in the Prestige app, place your cursor
on this line and hit `Ctrl+Enter`. The GET request will be executed, and the page will split vertically with the
response details shown in the right.

### Separating multiple requests

We can have multiple different requests in a single document. Just ensure they are separated by a line with `###`. Such
lines mark the end of a request and start of the definition of a new request. For example, we define two different GET
requests below:

```

GET http://httpbin.org/get?just_first=Sherlock

###

GET http://httpbin.org/get?just_last=Holmes

```

If we place our cursor on the first GET line and hit `Ctrl+Enter`, the first one would be executed. Similarly for the
second request. The request that gets executed depends on where the cursor is, *when the hotkey is invoked*.

### POST request with data

Let's execute a simple POST request with a JSON body:

```
POST http://httpbin.org/post
Content-Type: application/json

{
  "first": "Sherlock",
  "last": "Holmes"
}
```

There's three things to note here:

1. We've set a `Content-Type` header right below the POST line, to specify that the body is JSON.

1. The headers block, and the body content block are separated by a *single* blank line.

1. The cursor can be placed anywhere within the POST line and the last line of the POST body (*i.e.,* the `}` line),
   to execute this request.

Copy this over to a sheet in Prestige and hit `Ctrl-Enter` to execute this POST request. The response should show up
in the right.

### Custom headers

We saw how we can set the `Content-Type` header in the previous section, but this can be used to set the values of
most standard or any custom headers. Here's an example:

```
GET http://httpbin.org/headers
X-My-Awesome-Custom-Header: custom header value here
Another-Header: another header value
Header-Names-Are-Case-Insensitive: but values are case sensitive
```

Some standard headers like `Origin`, `Content-Size`, `Cookie` are set by default and usually don't make sense to
override here.

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
be executed only *after* we close the alert message. Now consider the following example:

```
###

GET http://httpbin.org/get

### javascript

alert("in js block")
```

If we put the cursor on the GET line and hit `Ctrl+Enter`, we see that the request is executed and no alert shows up.
This is because only the Javascript blocks that are above the request being executed, are evaluated.

Javascript blocks can be used for simple templating (explained in following section), or for much more advanced
scripting customizing the way Prestige executes requests.

## 3. Templating

Templating can illustrate the power of plain text. Although this feature is scratching the surface of what we can do
with Javascript blocks, it works as a great as a starter.

This is best explained with an example:

```
### javascript

this.data.firstName = "Sherlock"
this.data.lastName = "Holmes"

###

GET http://httpbin.org/get?first=${firstName}&last=${lastName}
```

Here, when we place the cursor on the GET line and hit `Ctrl+Enter`, Prestige first evaluates the Javascript block, and
then renders the GET request line as if it's a template string, with values from `this.data`. So, the request that
actually gets executed is the following:

```
GET http://httpbin.org/get?first=Sherlock&last=Holmes
```

That seems simple enough. But, we're not limited to using template interpolations (the `${}` thingies) in the query
params or just the URL, it's the whole thing! Method, check. URL, check. *Headers*, check. Here's a slightly crazy
example:

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

this.data.getRequest = (first, last) => {
    "GET http://httpbin.org/get?first=" + first + "&last=" + last
}

###

${ getRequest("Sherlock", "Holmes") }

###

${ getRequest("Isaac", "Asimov") }

```

All this is totally valid!

## Using the Response Pane

The Response pane shows up the first time we execute a request. As a minimum, it contains the following details about
the most recently executed request.

1. Time taken for the request to finish.
1. Changes to cookies, if any. Learn more in the [Cookie Management](#cookie-management) section.
1. Status code and reason.
1. Response body.
1. Response headers.
1. Request body.
1. Request headers.

If the request has been through one or more redirects, the responses of those intermediate requests are also available
in the response pane. Try the following request to see this in action:

```
GET http://httpbin.org/cookies/set?first=Sherlock
```

This request sets the cookie called `first` with the value `Sherlock` and then redirects to a different URL.

### Rich data viewing

Some response types can be shown in rich previews. For example, if the response content type is `text/html`, the
response pane can show that in a small iFrame which is probably more useful than the HTML source in the response body.

The following rich viewers are available currently:

1. JSON
1. HTML and XML
1. SVG

## Cookie Management

## Document Management

## Preferences / Options

## Advanced: Javascript Blocks

How is Javascript Evaluated: as a function body, can return a promise

Context details

Event handling (example handler sets `Content-Type` based on body data)

## Advanced: Request Blocks

Headers block is a template string

Body block can be any Javascript expression

## Tips and Tricks

1. GET requests can have a post body. This is allowed since APIs like Elasticsearch rely on such requests.
