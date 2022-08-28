---
description: >
  Requests can be constructed succintly using templating in the Prestige HTTP Client.
---

# Templating

Templating, in Prestige, refers to the feature of being able to write bits of Javascript in HTTP requests, and have
those bits of Javascript be replaced with the result of evaluating that Javascript code. That definition might not seem
like much but templating lends a lot of power for when writing HTTP requests in Prestige.

Before we get our hands dirty, an important point to note is that templating is different inside the headers section and
the request body section. This distinction might seem unnecessary at first, but after having been using Prestige for
almost a year, I can tell the needs of templating are *very* different when writing the body, compared to when writing
the URL and headers. Prestige tries to provide the best solution for power users at the cost of making it *slightly*
more complicated to new-comers.

## Headers Section

The templating syntax in the headers section is the same as that of Javascript's standard template strings.

What does that mean? That means we can write interpolations in the headers section using the syntax `${1 + 2}` and it
will be replaced by the value of the expression (`3` in this case). Consider the following example:

```
GET http://httpbun.com/get?answer=${2 * 21}
```

When we hit ((Ctrl+Enter)) on this, the request is actually sent to the URL `http://httpbun.com/get?answer=42`.

Internally, Prestige leverages your browser's support for template strings to do the interpolation here. It doesn't
include a templating engine doing this thing, it's just standard Javascript and your browser.

## Body Section

The body section is slightly less clever. First off, interpolations like the header section aren't directly. It is
instead treated like a static wall of text, just a bunch of characters to be sent as payload in the HTTP request. So in
the following request, the `${2 * 21}` is sent as is, not replaced by `42`.

```
POST http://httpbun.com/post

answer=${2 * 21}&hero=Arthur
```

The magic in the body section begins with an `=` sign. Quite literally. If the first character of your request body is
`=`, Prestige will expect a Javascript expression to follow and the result of that expression is used as the request
payload. That's it. Let's look at a few examples to drive home the point. *All* requests below are identical. They all
send the request body `answer=42&hero=Arthur`.

```
POST http://httpbun.com/post

= "answer=" + (2 * 21) + "&hero=Arthur"

###

POST http://httpbun.com/post

= `answer=${2 * 21}&hero=Arthur`

###

POST http://httpbun.com/post

= (() => {
    // Compute the answer here :)
    const answer = 2 * 21;
    return `answer=${answer}&hero=Arthur`;
})()
```

Have to admit, that's awesome right there! But let's sweeten it further eh? Guess what the following does?

```
POST http://httpbun.com/post
Content-Type: application/json

= {
    answer: 2 * 21,
    hero: "Arthur",
}
```

Yep, JSON! Since the expression after `=` evaluates to an *Object*, as opposed to a *String* (which was the case in the
previous examples), Prestige will notice the `Content-Type: application/json` header and just `stringify` the object for
you before sending it on its merry way as the request payload.

Additionally, this way of using an Javascript expression to build the body is also useful when you want to upload a file
as part of the request. See our guide on the [File Bucket](./file-bucket.md) for more details.

## Conclusion

This topic can be a bit daunting when you're new to Prestige, but I urge you to not completely ignore it. You can get by
in Prestige without ever having to deal with templating, but you'd be losing out on a lot of the power Prestige provides
you. You can always check our page on [Tips and Tricks](../tips.md) to see some real-world examples of how this can be
leveraged to make life easier.
