# Proxy

Prestige uses a small proxy server to execute the actual HTTP requests. The reason for this is to avoid CORS
restrictions by the browser. Briefly, what that means is that browsers don't let a web app running on `abc.com` to
execute HTTP requests to `xyz.com`, as a security measure. But in Prestige, even though it's opened from
`prestigemad.com`, we'd want to execute requests on other domains. Without that capability, Prestige would be a lot less
useful, honestly.

So, to resolve this, Prestige has a small proxy server running on the `prestigemad.com` server which executes the
requests on your behalf.

<svg width="600" height="250" version="1.1" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="10" rx="3" ry="3" width="150" height="30" stroke="black" fill="transparent" stroke-width="2"/>
  <text x="22" y="30">Prestige in browser</text>
  <line x1="85" x2="85" y1="40" y2="100" stroke="black" stroke-width="2"/>
  <polygon points="85 98 90 85 80 85 85 98" stroke="black" fill="black" stroke-width="2"/>
  <rect x="10" y="100" rx="3" ry="3" width="150" height="30" stroke="black" fill="transparent" stroke-width="2"/>
  <text x="43" y="120">Proxy server</text>
  <line x1="85" x2="85" y1="130" y2="190" stroke="black" stroke-width="2"/>
  <polygon points="85 188 90 175 80 175 85 188" stroke="black" fill="black" stroke-width="2"/>
  <rect x="10" y="190" rx="3" ry="3" width="150" height="30" stroke="black" fill="transparent" stroke-width="2"/>
  <text x="40" y="210">API Endpoint</text>
</svg>

## Local Endpoints

A consequence of using a proxy hosted elsewhere is that if you are hitting requests on `localhost`, they won't work. The
reason is resources on `localhost` are obviously hosted on your local machine, which are not accessible to the outside
internet (at least not as `localhost`). So, the proxy server up on `prestigemad.com` has no idea what to do with it.

However, you might've noticed that requests to `localhost` *do partially* work in Prestige. It's not magic though.
Prestige intelligently *doesn't use a proxy* when making requests to `localhost`.

TODO: How to disable the proxy?

TODO: How to change the proxy to point to somewhere else?

## Conclusion

The proxy is necessary piece of the puzzle to be able to run an HTTP request to any endpoint. For the most part though,
you shouldn't have to be concerned with it. But I'll point out that it is important to understand that it exists, and it
does what it does. Check our the [API Reference](../api-reference.md) to learn more about how to customize the proxy
that Prestige uses (or doesn't use).
