# Kora — Full-Stack E-Commerce Store

A modern full-stack e-commerce web application built as **Task 1 for the CodeAlpha Full Stack Development Internship**.

Kora provides a complete shopping experience including product discovery, product details, authentication, cart management, checkout, order processing, and order history.

## 🔗 Live Demo

https://code-alpha-ecommerce-store-two.vercel.app/

## ✨ Features

- Product listing with search
- Category filtering
- Product sorting
- Product details with stock information
- Quantity selection
- Shopping cart
- Cart quantity updates and item removal
- Free-delivery progress indicator
- User registration and login
- JWT-based authentication
- Password hashing with bcrypt
- Checkout with delivery information
- Server-side stock verification
- Server-side price verification
- Order processing
- User-specific order history
- MongoDB database integration
- Responsive frontend for different screen sizes

## 🛠️ Tech Stack

### Frontend
- HTML5
- CSS3
- Vanilla JavaScript

### Backend
- Node.js
- Express.js
- Mongoose

### Database
- MongoDB
- MongoDB Atlas

### Authentication
- JSON Web Tokens (JWT)
- bcrypt

### Deployment
- Vercel

## 🏗️ Application Architecture

Kora follows a full-stack architecture where the frontend communicates with an Express.js API and application data is stored in MongoDB.

```text
Browser
   ↓
Frontend
HTML + CSS + JavaScript
   ↓
Express.js REST API
   ↓
Mongoose
   ↓
MongoDB
