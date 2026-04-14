# 🦠 AI Virus Spread Predictor

A web-based simulation tool that models the spread of a virus through a population using the **SIR (Susceptible–Infected–Recovered)** mathematical model.

## 📌 About

This project was built as a Biology mini-project to visualize how infectious diseases spread and recover in a population. Users can tweak parameters like infection rate, recovery rate, and population size to see real-time epidemic curves.

## 🚀 Features

- Interactive SIR model simulation
- Real-time chart rendering with Chart.js
- AI-generated insights (peak day, severity, herd immunity threshold)
- Clean, responsive UI with dark mode

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Python, Flask |
| Frontend | HTML, CSS, JavaScript |
| Math | NumPy, SciPy (ODE solver) |
| Charts | Chart.js |

## ⚙️ Setup & Run

```bash
# 1. Clone the repo
git clone https://github.com/DRAKS17/AI-VIRUS-PREDICTOR.git
cd AI-VIRUS-PREDICTOR

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run the app
python app.py
```

Then open your browser at: `http://localhost:5000`

## 📊 Parameters

| Parameter | Description |
|-----------|-------------|
| Population (N) | Total number of people |
| Initial Infected | Number of people infected at day 0 |
| β (Beta) | Infection transmission rate |
| γ (Gamma) | Recovery rate |
| Days | Simulation duration |

## 📁 Project Structure

```
mini/
├── app.py              # Flask backend + SIR model logic
├── requirements.txt    # Python dependencies
├── templates/
│   └── index.html      # Main UI page
└── static/
    ├── css/style.css
    └── js/script.js
```

## 👨‍💻 Author

**Daksh Shaparia** — Sem 3 Biology Mini Project
