# Javascript Blocks

Javascript blocks begin with the line `### javascript`. That is, when the page-break marker (line starts with `###`) has
`javacript` after the triple hashes, the following block will be treated as Javascript instead of an HTTP request.

For example, consider the following sheet:

```
GET http://httpbun.com/get?id=1

### javascript

alert("ha")

###

GET http://httpbun.com/get?id=2
```

Here, we have two HTTP requests defined with a Javascript block in the middle. If we were to execute the first HTTP
request, the Javascript block **will not** be evaluated. If we were to execute the second HTTP request, the Javascript
**will** be evaluated before the HTTP request is made. This is because only the Javascript blocks that are above the
request being executed, are evaluated.

Obviously, calling `alert` in a Javascript block here, although awesome, isn't a whole lot useful. Prestige provides
APIs that can be used within these Javascript blocks to setup template data (see [Templating](./templating.md)), change
proxy configuration, event handling (coming soon), etc. See the [API reference](../api-reference.md) for full details on
the APIs available.

## Evaluation Details

*This is a slightly advanced topic that is not essential to normal usage of Prestige.*

The code inside the Javascript blocks is evaluated by first building a `Function` object out of it, and then calling
that function.

For example, consider the following Javascript block:

```
### javascript
alert("hello there")
```

This is (roughly) converted into the following function:

```javascript
async function () {
    alert("hello there")
}
```

This function is then called as `await fn.call(context)`, where the context object is constructed specifically for this
function and will be available as `this` inside the function body.

Since this is an async function we are building, you are free to use the `await` syntax to call upon any asynchronous
tasks inside the Javascript blocks. Prestige will wait for this `async` function to resolve before proceeding.

## Conclusion

Javascript blocks provide real programming ability making Prestige sheets programmable environments. They also lend a
lot of flexibility to power users in they way they can execute HTTP requests. Learn more about that in our
[Templating](./templating.md) guide.
