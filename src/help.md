# Prestige User Guide

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
