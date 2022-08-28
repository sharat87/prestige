FROM scratch

ADD prestige /prestige

ENV PORT=80
EXPOSE 80

ENTRYPOINT ["/prestige"]
