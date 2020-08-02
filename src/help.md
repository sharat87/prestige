# Prestige User Guide

> Just an HTTP Client, by Shrikant.

Prestige is a minimal-UI HTTP client, intended for use as a development tool. In some ways, it is similar in what tools
like [Postman](https://postman.co) or [Insomnia](https://insomnia.rest) address, but with a different and far more
flexible take. For starters, there's no input boxes for URLs, drop-downs for methods etc. All that UI is done away with.
Instead, the interface is inspired by a traditional text editors and IDEs. For example, the following a POST request
with details that should be self-explanatory.

```
POST http://my-awesome-api.com/users
Content-Type: application/json

{
  "name": "Byomkesh Bakshi",
  "occupation": "Detective",
  "city": "Kolkata"
}
```

To the uninitiated, that might seem less useful and less powerful to a fancy UI based tool, but since it's just text,
it's extremely malleable. Prestige provides tools like clever templating, Javascript powered post body generation,
pre-execution callbacks etc., that power you to play with APIs at new speeds. Welcome to parts of the past that remind
of the future.

This document is the definitive user guide for Prestige. If you have questions, suggestions, or bug reports to make,
GitHub Issues is currently the best place to do so. Thank you for trying out Prestige, I hope you like it!
