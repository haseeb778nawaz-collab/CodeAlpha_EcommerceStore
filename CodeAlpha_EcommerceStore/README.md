# Kora - Simple E-commerce Store (CodeAlpha Task 1)

Full stack e-commerce store built with **HTML, CSS, vanilla JavaScript**, **Node.js + Express** and **MongoDB (Mongoose)**.

## Features
- Product listing with search, category filter and sorting
- Product details page (features, stock status, quantity picker)
- Shopping cart drawer (add, remove, change quantity, free-delivery progress), saved in the browser
- User registration and login (bcrypt hashed passwords + JWT)
- Checkout with delivery details and order processing (stock is checked and reduced atomically on the server, prices are always taken from the database)
- Order history ("My orders")
- MongoDB collections: `users`, `products`, `orders` (order items are stored inside each order)

## Run locally
```bash
npm install
cp .env.example .env      # on Windows: copy .env.example .env
npm start
```
Open http://localhost:3000. Products are seeded automatically on the first run (and re-seeded when the catalogue changes). MongoDB must be running on `mongodb://127.0.0.1:27017` (or set `MONGO_URI` in `.env`, for example a MongoDB Atlas URL).

## Deploy on Vercel
1. Create a free MongoDB Atlas cluster, a database user, and allow network access `0.0.0.0/0`.
2. Push this project to GitHub (never commit `.env`).
3. In Vercel: Add New, Project, import the repo, and add environment variables `MONGO_URI` (Atlas string ending in `/kora_store`) and `JWT_SECRET`.
4. Deploy. `api/index.js` and `vercel.json` route `/api/*` to the Express app; `public/` is served as static files.

## API
| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | /api/auth/register | no | Create account |
| POST | /api/auth/login | no | Log in, returns JWT |
| GET | /api/products?search=&category=&sort= | no | List products (sort: new, low, high, rating) |
| GET | /api/products/:id | no | Product details |
| POST | /api/orders | yes | Place order `{items:[{id,qty}], address}` |
| GET | /api/orders | yes | Logged-in user's orders |

## Product photos
Photos are free Unsplash images (Unsplash License), linked from the `seed` array in `server.js`. Each product has an `image` URL; if a photo fails to load, the built-in SVG art is shown instead. To change a photo, edit its id in the seed and run once with `RESEED=true npm start` (PowerShell: `$env:RESEED="true"; npm start`). For a real deployment, download the photos into `public/img/` and point `image` to `/img/yourfile.jpg`.

## Folder structure
```
CodeAlpha_EcommerceStore/
├── server.js        # Express app, Mongoose models, routes, seed data
├── package.json
├── .env.example
└── public/          # index.html, style.css, app.js
```
