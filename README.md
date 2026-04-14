# AI Virus Spread Predictor

A web-based simulation tool that models the spread of a virus through a population using the SIR (Susceptible-Infected-Recovered) mathematical model.

## About

This project was built as a Biology mini-project to visualize how infectious diseases spread and recover in a population. Users can adjust parameters like infection rate, recovery rate, and population size to observe real-time epidemic curves.

## Features

- Interactive SIR model simulation
- Real-time chart rendering
- Insights like peak infection day, severity level, and herd immunity threshold
- Clean and responsive UI

## Tech Stack

- Backend: Python, Flask
- Frontend: HTML, CSS, JavaScript
- Math: NumPy, SciPy
- Charts: Chart.js

## Setup and Run

Clone the repository and install dependencies:

    pip install -r requirements.txt

Then run the app:

    python app.py

Open your browser at http://localhost:5000

## Parameters

- Population (N) - Total number of people
- Initial Infected - Number of people infected at day 0
- Beta - Infection transmission rate
- Gamma - Recovery rate
- Days - Simulation duration

## Project Structure

    app.py              - Flask backend and SIR model logic
    requirements.txt    - Python dependencies
    templates/index.html - Main UI page
    static/css/style.css
    static/js/script.js

## Author

Daksh Shaparia - Sem 3 Biology Mini Project
