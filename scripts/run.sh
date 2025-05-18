#!/bin/bash

# Run backend and frontend concurrently

# Start backend in background
(cd ../backend && npm start) &

# Start frontend
(cd ../frontend && npm run dev)
