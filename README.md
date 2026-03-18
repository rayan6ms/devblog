# devblog

`devblog` is a personal software development blog built with Next.js. It is a place for tutorials, opinions, rants, suggestions, experiments, and other writing that fits a developer blog, with an extra playground page for small games and interactive side projects.

This project is intentionally simple. It is a hobby project first, but it also works as a way to show frontend and product-building capability without turning into a heavy CMS.

## Features

- Personal blog structure with home, recent, trending, tag, search, post, profile, about, and playground pages
- Responsive, polished UI with custom layouts, card-based sections, and interactive details
- Topic discovery through recent posts, trending posts, tags, and search
- Social authentication foundation with NextAuth and Prisma
- GitHub and Google providers configured in the auth route
- Role-aware authoring flow for creating posts
- Playground page with small games, sketches, and interactive experiments
- Prisma schema for users, posts, comments, bookmarks, feedback, and reading progress

## Stack

- Next.js
- React
- Tailwind CSS
- Prisma
- NextAuth
- PostgreSQL
- Phaser
- Three.js

## Running Locally

Install dependencies:

```bash
npm install
```

Create an `.env` file with at least:

```bash
DATABASE_URL=...
NEXT_PUBLIC_SITE_URL=https://your-production-domain.example
```

If you want to test social login locally, also configure the provider credentials required by Auth.js for the GitHub and Google providers used in `app/api/auth/[...nextauth]/route.ts`.

Start the app:

```bash
npm run dev
```

Then open `http://localhost:3000`.

## Notes

- This is not meant to be a complex publishing platform.
- The project favors a minimal, authored feel over lots of product surface area.
- The playground exists because I like building small interactive things, not because this is a game-dev portfolio.

## SEO

Generate the checked-in SEO files with:

```bash
node scripts/generate-seo-files.mjs
```

This writes `public/sitemap.xml` and `public/robots.txt`. For production-safe canonical URLs and sitemap hosts, set `NEXT_PUBLIC_SITE_URL` to the live domain before running it.
