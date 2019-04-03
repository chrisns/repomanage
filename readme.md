# Repo Manager

The idea of this is to automate management of an organisations repositories based on github topics

It's intended to run on a github org that might not want to adopt it as an organisation plugin so likes to run with an individual's github token

It's also intended to run in an org where there's lots of teams all doing their own thing, so you just want to limit it to managing the repos your team care about.

```bash
$ docker run --rm -ti \
  -e TOPIC=mytopic \
  -e ORG=myorg \
  -e TEAMNAME=myteam \
  -e ADMIN_TEAM=myadminteam \
  -e GITHUB_TOKEN=XX \
  chrisns/repomanage
```