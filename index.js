const topic = process.env.TOPIC
const org = process.env.ORG
const teamname = process.env.TEAMNAME
const admin_team = process.env.ADMIN_TEAM

const Promise = require("bluebird")
const _ = require('lodash')
const readFile = Promise.promisify(require("fs").readFile)

const Octokat = require('octokat')

const token = process.env.GITHUB_TOKEN

const octo = new Octokat({
  token: token,
  acceptHeader: "application/vnd.github.drax-preview+json" // Header for using Licence Preview API
})

const octo2 = new Octokat({
  token: token,
  acceptHeader: "application/vnd.github.luke-cage-preview+json"
})

const fetchAll = (fn, args) => {
  let acc = [] // Accumulated results
  let p = new Promise((resolve, reject) => {
    fn(args).then((val) => {
      acc = acc.concat(val)
      if (val.nextPage) {
        return fetchAll(val.nextPage).then((val2) => {
          acc = acc.concat(val2)
          resolve(acc)
        }, reject)
      }
      resolve(acc)
    }, reject)
  })
  return p
}

const makeOrGetIssue = (repo, template) =>
  getTemplateIssue(template)
    .then(result => this.template = result)
    .then(() => fetchAll(repo.issues.fetch))
    .then(issues => issues[0].items)
    .map(result => result.title)
    .then(titles => _.includes(titles, this.template.title))
    .then(issueExists => {
      if (!issueExists) {
        return createIssue(repo, this.template.title, this.template.body)
      }
    })

const getTemplateIssue = template =>
  readFile(`./issueBodies/${template}.md`, { encoding: 'utf8' })
    .then(contents => {
      let splitup = contents.split(/\r\n|\r|\n/)
      return {
        title: splitup.shift(),
        body: splitup.join('\n')
      }
    })

const createIssue = (repo, title, body) =>
  repo.issues.create({
    title: title,
    body: body
  })


const fetchAllRepos = async () => {
  let response = await octo.fromUrl('https://api.github.com/search/repositories?q=topic:{topic}&user:{org}', { topic: topic, org: org }).fetch()
  let aggregate = [response.items]
  while (response.nextPage) {
    console.log(`fetched a page for ${org}`)
    response = await response.nextPage()
    aggregate.push(response)
  }
  return aggregate
}

(async () => {
  const repos = await fetchAllRepos().then(_.flattenDeep)

  repos.forEach(async repo => {
    let Repo = await octo2.repos(repo.owner.login, repo.name)
    await Repo.branches("master", "protection").add({
      enforce_admins: true,
      required_status_checks: null,
      restrictions: null,
      dismiss_stale_reviews: true,
      required_pull_request_reviews: {
        required_approving_review_count: 1
      }
    })
    await Repo.collaborators.fetch().then(collaborators => collaborators.items.map(collaborator => Repo.collaborators(collaborator.login).remove()))
    await octo.teams(await octo.orgs(org).teams(teamname).fetch().then(f => f.id)).repos(org, repo.name).add({ permission: "push" })
    await octo.teams(await octo.orgs(org).teams(admin_team).fetch().then(f => f.id)).repos(org, repo.name).add({ permission: "admin" })

    if (repo.license === null)
      await makeOrGetIssue(Repo, "license")

    if (await Repo.readme.read().catch(e => true).then(r => false))
      await makeOrGetIssue(Repo, "readme")
  })
})()