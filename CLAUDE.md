# CLAUDE.md — Дельный МППСС

A static browser game that teaches COLREG (МППСС) by play: text quests in the style of Space Rangers 2,
tied together by a chart of ports. No server, no accounts, no neighbouring components. Answer the user in
Russian. Player-facing text and docs are Russian; code and comments are English.

**This file is an orientation map and a set of rules, not documentation.** It carries what is hard
to discover by reading the code. For anything a grep answers in seconds, read the code. The game's
overview is `docs/FREIGHT.md`.

The site is live: a push to `main` publishes it, and players keep their progress in their own
browsers. Stability is the goal, and every change is judged on what else it might move.

JavaScript ES modules in the browser, no npm dependencies · Canvas 2D, Web Audio · Node 24 with
`node:test` for tests and the Quest Lab · Python `http.server` for the local preview.

## Scope

One developer owns the project, and Claude does the work. Everything in the repository serves the game:
`index.html`, `src/`, `tools/questlab/`, `quests/freight/`, `tests/`. `freight.html` redirects to the main
page. The old textbook and the prototypes were removed in 0.13; the last commit that has them is `6e1bd23`.

## Where things live

| | |
|---|---|
| `src/freight.js` | Wires the game: quest screen, mast, review, rule book. The only module that sees all others |
| `src/freight-port.js` | The port panel as HTML strings, without the DOM, so tests can read it |
| `src/freight-about.js` | Impressum, Datenschutz and sources, shown in the game's drawer |
| `src/freight-book.js` | The rule book: every rule and annex, searchable, typeset, linked to itself, with part, section and editorial notes |
| `src/freight-figures.js`, `-signals.js` | Figures beside the rules: lights and situations by bearing (from the sea's sectors), schemes; playable signals, day shapes, distress |
| `src/freight-world.js` | Ports, passages, offers, fittings, watchkeepers, world memory. Pure, shared with the Quest Lab |
| `src/quest-vm.js`, `src/quest-assemble.js` | Quest machine without `eval`, errand assembly. Shared by the game, the Quest Lab and tests |
| `src/freight-sea.js`, `-chart.js`, `-audio.js`, `-practice.js` | Wheelhouse view, chart, sound, light drills on passages |
| `src/rules-text.js` | Local COLREG text with recorded editorial fixes, guarded by `tests/book.test.js`. Data, outside the size ceilings |
| `quests/freight/` | `.quest` sources: contracts, `deck/` encounters, `errands/`, the `errand.quest` template. The compiled `*.json` files are **generated**; only `catalog.json`, the list of contracts, is edited by hand. `VOICE.md` and `STORY.md` are the writing rules |
| `tools/questlab/` | Compiler, solver, prose linter, name contracts and the `ql` CLI. `gates.json` holds thresholds and known debts |
| `tests/` | `node:test` suites. `structure.test.js` holds the module boundaries |
| `scripts/` | The static build into `dist/` (generated) and the agent Stop hook |

## Things that will cost you a day if you don't know them

- **Compiled quests are generated.** Edit `.quest` only, then `ql build <file>` for a contract or
  `ql bundle` for the deck, errands and template. A test fails when a JSON lags its source.
- **Quests talk to the code through names.** Scenes, sights, world parameters, rule numbers and
  placeholders are strings, checked by `tools/questlab/contract.js` in `ql gates`. A new scene, vessel
  type or world parameter appears in the game's code first.
- **World parameters cross voyages.** A `world` parameter in `deck/ship.quest` enters a quest as its
  start value and leaves it as its end value. `WORLD_VARS` in `freight-world.js` must list it.
- **Randomness goes only through weighted jumps** (`@roll`, weighted `->`), or the solver cannot
  compute exact probabilities. `@roll` moves the location's body to `<id>__`.
- **The solver sees numbers, not text.** Conditional paragraphs (`? cond ::`), radar lines and
  watchkeeper lines change what the player knows, not the state. Balance them by hand.
- **Saves are a contract with players.** The game keeps them under `deelstuff.colreg.freight.v2`.
  Renamed locations break unfinished voyages, and a breaking change needs a new key with a migration.
- **Legal pages stay true and reachable.** The owner is in Germany. Impressum and Datenschutz open from
  every screen («О проекте» in the tools bar, the port footer) and from `#impressum` and `#datenschutz`.
  When the site stores something new or loads anything external, update `src/freight-about.js` in the
  same change; a test checks that the Datenschutz names the game's storage key.
- **Colour belongs to lights only**, and lights come from the Rule 21 sectors, never set by hand.
- **Rule wording is checked with `ql facts`** against `rules-text.js`, not from memory. "May", "should"
  and "shall" differ, and practical advice is never presented as a rule.
- **Ceilings only go down.** File size, long lines and allowed imports live in
  `tests/structure.test.js`; when that test gets in the way, change the code. Known debts live in `waivers` in `gates.json` and only shrink; a paid debt
  left on the list fails. Raising a ceiling, lowering a threshold or adding a debt needs the
  developer's consent. `freight-sea.js` and `tools/questlab/cli.js` are close to the 20 KB ceiling.
- **`node` and `npm` are off PATH** on the author's machine. `tools/questlab/ql` finds a Node 24.
- **CI:** `check.yml` runs `npm test` and `npm run gates` on every push except to `main`;
  `pages.yml` runs both, builds and deploys on `main`. The Stop hook `scripts/agent-check.sh` runs the
  tests, and the gates when quest-related files changed, after a turn that left the tree dirty.

## Contracts with the outside

Players' saves under `deelstuff.colreg.freight.v2`, and the published URLs. `/` and
`freight.html` open the game, which also answers `#impressum`, `#datenschutz`, `#sources`, `#rules`,
`#rule-N` and `#annex-N` for old links and bookmarks. Any other missing path gets `404.html`, which sends
the visitor to `/`. Nothing else calls this project.

## Conventions

- Code: one-space indent, dense lines of at most 200 characters, a comment only where the reason is
  not obvious. No npm dependencies, no `eval`.
- Commits: English, an imperative subject, a body that says why, a short list of what changed, then
  what is still unproven.
- Quests: a new one goes through the `quest-forge` skill, in the voice of `quests/freight/VOICE.md`
  and by the rules of `quests/freight/STORY.md`. Creative dice are thrown with
  `tools/questlab/ql roll 12 20` (seed from seconds and nanoseconds), never in the model's head; the
  tables are in `STORY.md`, and the seed and the numbers go into the report.

## Working agreements

These are what a reviewer checks. They apply to every change in this project.

### Git

Never `git commit` or `git push` unless the developer asks for it in that moment. Leave the work
in the working tree and describe what changed. Permission to commit one change does not carry over
to the next. A push to `main` publishes the site.

### Tests, gates and builds

Claude maintains this project alone, so Claude decides when to run checks and runs them without
handing them to the developer. The minimum:

- `tools/questlab/ql test` (about a second) after every change to code or quests, and before saying
  a task is done.
- `tools/questlab/ql gates` (about a minute), always, after a change in `quests/`, `tools/questlab/`,
  `src/quest-*`, `src/freight-world.js` or `src/freight-sea.js`, and before committing such a change.
- `tools/questlab/ql site`, the static build into `dist/`, when a change touches an entry page, the
  build script or the file layout.
- A browser pass for anything a player sees. Serve with `python3 -m http.server 4183 --bind
  127.0.0.1` and open it on `localhost`, so the author's saves on `127.0.0.1` stay untouched.

Report what ran and its result, failures included. A check that was skipped is reported as skipped.

### Production code, and blast radius

The site is live. Stability outranks elegance, and an unintended behaviour change is worse than a
missing improvement.

So when a change touches code with more than one caller, being convinced it is correct is not
enough. Here that is above all `quest-vm.js` (game, Quest Lab, tests), `quest-assemble.js`,
`freight-world.js` (game, chart, port panel, Quest Lab), `rules-text.js` (rule book and `ql facts`) and
`deck/ship.quest` (every contract and errand).

- Find every caller before editing (`grep` the symbol; do not rely on the callers you happen to
  know about) and check the change against what each of them expects.
- State the result. Either "behaviour-preserving for all N callers" with the list, or "this
  changes behaviour for X, deliberately, because …". Silence here reads as "not checked".
- When a shared helper needs to behave differently for one caller, prefer a new parameter with the
  old default, or a separate function, over changing what the existing callers get — but never a
  boolean that switches the helper between two jobs.
- If you cannot establish the blast radius from the source, say so and ask, rather than shipping a
  change whose reach you are guessing at.

### Design principles

Follow SOLID, DRY, KISS and YAGNI. Reach for a GoF or GRASP pattern when it makes the design
clearer, more flexible or easier to maintain — never to demonstrate the pattern. Prefer:

- clarity over cleverness
- simplicity over premature abstraction
- composition over unnecessary inheritance
- explicit design over hidden behaviour
- testability over convenience

Here that means:

- **Entry points are wiring, not logic.** `freight.js` reads clicks and dispatches; rules, money and
  quests live in pure modules that run in Node without a browser (`PURE` in `structure.test.js`).
- **Extend at the extension point.** A new encounter is a file in `deck/`, an errand a file in
  `errands/`, a big contract a `.quest` with a `route` header plus a line in `catalog.json`, a
  fitting a `world` parameter plus an `UPGRADES` entry, a watchkeeper a `CREW` entry plus a line in
  each encounter. Not another mode flag inside existing code.
- **Depend on the narrowest interface that fits**, not on the framework underneath it. That is both
  the interface-segregation seam and what makes a unit testable in isolation.
- **Reuse the seams that exist** — the quest machine, `ql`, world parameters, news lines, the
  encounter deck. A second mechanism alongside an existing one is what needs justifying.
- **No hidden coupling between quests and code**: names go through the checked contract, not
  through ad-hoc strings.
- **YAGNI**: no setting, extension point or generic parameter for a caller that does not exist yet.
- **Change the design when a feature does not fit it**; do not bolt the feature on. A module keeps
  one responsibility: no mode flags, no function that works only after another one ran, no `null`
  meaning "nothing to do", one mechanism per job.
- **One subsystem, one module**, with imports pointing one way (`DEPENDS` in `structure.test.js`).
- **Delete code that adds nothing.**

### Fit the surrounding code

New code should be hard to tell apart from the code already there. Before writing any, read the
nearest existing equivalent and copy its shape — naming, structure, error handling, logging, how
it gets wired — rather than importing habits from elsewhere.

- A new member of a family (an encounter, an errand, a fitting, a watchkeeper, a `ql` command)
  copies a sibling: how it is declared, wired, validated, and how it reports back.
- A new module follows the shape of `freight-world.js` or `freight-port.js`: pure where it can be,
  declared in `DEPENDS`, read by tests.
- A new call to an external system goes through the same path as every other: quest data loads
  through `fetchJson` in `freight.js`.

When a house pattern and a general best practice disagree, follow the house pattern and say that
you noticed: consistency across the project beats local optimality, and a lone island of a better
idiom costs the next reader more than it saves. Do not introduce a new library or idiom where an
established one already covers the case, and do not restyle the surrounding code to match your
preference.

### Precise changes and readability

- The reviewer does not want to re-review existing, working code. Keep every change as small and
  as local as the task allows.
- Do refactor when the result is genuinely smaller, simpler, safer or easier to read. A smaller
  diff does not beat clearly better code — but it does beat merely rearranged code.
- Small functions are a means, not a goal. When a reader has to jump through a chain of one- and
  two-line helpers to follow a single thought, readability has gotten worse. Never write a function
  of a few lines whose single caller could hold its code — put the code there, guard clauses
  included. That holds for functions that only forward a call, and over "copy its shape" when the
  neighbour you copy delegates the same way. Inlining one is not duplication.
- Real duplication is two functions doing the same thing with a difference that can become a
  parameter. Extract the difference into an argument; a lambda is a perfectly good argument.

### New functionality

New functionality is isolated functionality: its own module, as few couplings as possible, meeting
the rest of the system through a **single entry point** — one module, one function, one data
table. If it only works after edits scattered across existing modules, the entry point has not been
found yet.

### Code that explains itself

The code is the documentation: names, modules and signatures make a module clear without comments.
Every comment is read on every visit, by developers and LLMs alike; one that repeats the code costs
time and tokens and adds nothing.

- **Name things for what they are in the domain**, not with words that fit anything. A boolean
  names the question it answers. Where a concept has an established name, use it.
- **Fix unclear code before commenting it.** If a comment is needed to say *what* the code does,
  rename or restructure instead. A comment says *why*: a constraint, a trade-off, a library quirk.
- **A module's head comment is one or two sentences on its role in the system.** It stays true
  when the implementation changes; one that needs editing with every change describes the
  implementation — cut it.
- No doc comment that repeats the signature, no comments on self-describing fields, getters or
  overrides.
- Comments describe **current behaviour only** — no "previously", no "instead of", no migration
  notes. That belongs in the commit message and the PR description. English only.

Where a file's choices are genuinely non-obvious and expensive to rediscover, its comments may be
dense — but they still say why, and new code there matches that density.

### Texts in the developer's name

A commit message, a PR description, a review reply, an issue or a mail to a list goes out under the
developer's name and is read by people who give their time to it. It has to read as the developer
wrote it. Nothing is posted, pushed or sent before the developer has approved the exact text.

- **Write as the developer speaks.** Plain English with the correct technical terms, short
  sentences, no polished or idiomatic phrases. Do not state agreement or opinions for the developer
  ("that makes sense", "I agree that…"); start with what was done.
- **One idea per sentence.** A sentence that packs several facts, numbers and brackets is easy for
  a model and hard for a person. Say what it means first, then the detail, and leave out numbers
  and identifiers the reader does not need to follow the point.
- **A reply is a conversation, not a publication.** It addresses the person it answers. Someone who
  opens the thread later should still follow it: a short summary first, and a sentence before each
  table that says what it shows. But no paragraph addressed to an audience, and no explaining to a
  reviewer what the reviewer proposed.
- **Show doubt where there is doubt.** Where a choice is open, say what was considered and what it
  would cost, and ask for the other person's view ("I could try X, but it makes the solution more
  complex. What do you think?"), not a flat statement followed by an instruction.
- **Thank people for their time**, in plain words, where it is true.
- **Answer once.** No interim "I will do X" message when the result follows within a day; one reply
  with the change and the numbers.
- **One issue carries the history.** When the approach changes, update the existing issue and keep
  the earlier approaches, with the reason each was dropped, in its description.

### Tests

Do not write exhaustive tests that walk every function and every edge case. Cover the common
cases; one case may assert several related behaviours rather than being split across many. A new
focused test is what you add when a bug turns up. Stay in the style of the existing suite:
`node:test` with `assert/strict`, real quests and the solver instead of mocks. A test name states
what it asserts in at most five words, without articles; the detail belongs in its assertions.
Older tests have longer names; leave them as they are.

### Performance work

Any change that can affect performance has to be measured, not argued. Report a table — before vs.
after, with the input, its size and the metric (run time, payload size, …) — and say which branch
or commit each column came from. Run both sides yourself on the same input. The usual benchmarks
are `time tools/questlab/ql gates` and `/usr/bin/time -l tools/questlab/ql check
quests/freight/plombir.quest`; on 15 November 2026 the latter took 51 s, solved 859,493 states and
peaked at 1.7 GB of memory.

### Secrets and infrastructure

- Never open, print, grep or copy the contents of files that hold keys or credentials: `.env*`,
  `*.pem`, `*.key`, SSH keys and anything in `~/.ssh/`, `.netrc`, token files, keychains, cloud and
  CLI auth configs. Do not echo environment variables that may hold tokens. Noting that such a file
  exists is fine; reading it is not. If a task seems to need one, stop and ask.
- The repository holds no server addresses, logins, credentials, access paths or SSH aliases, and it
  stays that way: not in code, docs, quests, tests, comments or commit messages. What it does hold is
  public: the loopback `127.0.0.1` for the local preview, and in `docs/PUBLISHING.md` the GitHub
  repository, the site's domain, its DNS record and the GitHub Pages setup. Add nothing beyond that.
- `.gitignore` keeps common key files out of commits; that is a backstop, not permission to create
  them here. Check every diff for such details before a commit.
- The site is deployed only by GitHub Actions from `main`. Do not change hosting or DNS settings.
- Never pass secrets to worker models. Delegation and the review checkpoints follow the global
  CLAUDE.md; a worker's spec carries the rules of this file that its task touches.

### Keeping this file honest

This file is only useful while it is true, and it goes stale silently.

- Fix a line that contradicts the code **in the same change** that found it, and say so in your
  response.
- Three or more contradictions, or a whole section describing something that no longer exists,
  means the file is no longer trustworthy: stop, re-verify that section against the code, correct
  it, and tell the developer what was wrong. Do not keep working from a section you have caught
  lying.
- Fix facts freely; never quietly drop or soften a rule. Rules change only when a developer says
  so.
- Keep it short. If a section grows longer than the code it describes, cut it back to the
  non-obvious part — anything a grep answers in seconds does not belong here, and every line costs
  tokens on every task in this project.
