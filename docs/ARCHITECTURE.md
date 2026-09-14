# Architecture

## What this is

A small self-hosted URL shortener built on Express, EJS, and MongoDB (via Mongoose). Anyone can shorten a link from the home page with no account. Creating an account additionally gets you:

- **Custom aliases** — pick your own short code instead of a random one.
- **A dashboard** — every link you've made, with a live click count.
- **Collections** — named folders to file your links into.

## Request flow

```mermaid
flowchart TD
    A[Visitor] -->|GET /| B[homeRouter]
    A -->|POST / longUrl + submit=Generate Short URL| B
    B -->|creates UrlMap, owner = session user or null| C[(MongoDB)]

    D[Signed-in user] -->|POST /app/ longUrl + customCode| E[CustumUrlRouteres]
    E -->|via middleware.js| F{Signed in?}
    F -->|yes| C
    F -->|no| G[stash body on session.addUrl, redirect /login]
    G --> H[loginRouter / registerRouter]
    H -->|on success, resumePendingAction reads session.addUrl| C

    D -->|GET /dashboard| I[dashboardRouter]
    I --> C
    D -->|POST /addcollections| J[addCollections]
    J --> C
    D -->|POST /change_collection| K[ChangeCollectionRoutner]
    K --> C

    L[Anyone] -->|GET /:code| B
    B -->|findOneAndUpdate clicks++, then redirect| L
```

## Data model

```mermaid
classDiagram
    class User {
        ObjectId _id
        String username (unique)
        String password (bcrypt hash)
    }
    class Collection {
        ObjectId _id
        String name
        ObjectId owner -> User
    }
    class UrlMap {
        ObjectId _id
        String shortUrl (unique)
        String longUrl
        ObjectId owner -> User (nullable)
        ObjectId collectionId -> Collection (nullable)
        Number clicks
    }
    User "1" --> "0..*" Collection : owns
    User "1" --> "0..*" UrlMap : owns
    Collection "1" --> "0..*" UrlMap : files
```

`UrlMap.owner` and `UrlMap.collectionId` are both nullable: an anonymous shortener submission has neither; a signed-in user's plain "Generate Short URL" click has an owner but no collection until they file it with `/change_collection`.

One implementation note worth flagging for anyone extending this: Mongoose documents reserve the property name `collection` for the underlying MongoDB collection handle, so a schema field named `collection` breaks model compilation with a cryptic `Cannot read properties of undefined` error at startup. This schema uses `collectionId` instead — found the hard way, while first wiring this up.

## The "shorten now, sign in to save" handshake

This is the one piece of cross-cutting logic in the app, and it's what `middleware.js`, `resumePendingAction.js`, and `session.addUrl` exist for:

```mermaid
sequenceDiagram
    participant U as Anonymous user
    participant S as Server
    participant DB as MongoDB

    U->>S: POST /app/ (longUrl, customCode)
    S->>S: middleware.js: no session.user, submit != "Generate Short URL"
    S->>S: session.addUrl = req.body
    S-->>U: 302 /login

    U->>S: POST /login (username, password)
    S->>DB: find user, bcrypt.compare
    DB-->>S: match
    S->>S: session.user = {...}
    S->>S: resumePendingAction(req)
    S->>S: reads session.addUrl, validates it, clears it
    S->>DB: create UrlMap {owner: user._id}
    S-->>U: 302 /dashboard
```

The plain "Generate Short URL" button on the home page is exempt from this — `middleware.js` checks for that exact submit value and lets it through regardless of session state, which is how anonymous shortening works at all.

## Route mounting order

`app.js` mounts `homeRouter` at `/` **last**, after every other router. `homeRouter` owns `GET /:code` (the short-link resolver), and Express matches mounted routers in registration order — if it were mounted before, say, `/dashboard`, every dashboard request would first match `/:code` with `code = "dashboard"` and 404 as an unknown short link. This exact ordering bug existed in the app as briefly reconstructed before testing caught it; the fix is just mount order, not routing logic.

## Storage

Everything lives in one MongoDB database, three collections (`users`, `urlmaps`, `collections`, per Mongoose's default pluralization). No caching layer, no queue — every request that touches data does a direct Mongo round-trip. Fine at this scale; see SECURITY.md #7 for the one thing (session storage) that won't survive being scaled past a single process as-is.

## Local development

```mermaid
flowchart LR
    subgraph Local machine
        A[node app.js :3000] --> B[(mongod :27017)]
        C[Browser] --> A
    end
```

See the README's **Getting started** section for the exact commands.
