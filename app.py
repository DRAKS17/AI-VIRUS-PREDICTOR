import numpy as np
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from scipy.integrate import odeint

app = Flask(__name__)
CORS(app)

# ---------------------------------------------------------------------------
# SIR Model
# ---------------------------------------------------------------------------

def sir_model(y, t, beta, gamma, N):
    """SIR differential equations."""
    S, I, R = y
    dS_dt = -beta * S * I / N
    dI_dt =  beta * S * I / N - gamma * I
    dR_dt =  gamma * I
    return dS_dt, dI_dt, dR_dt


def run_simulation(population, initial_infected, beta, gamma, days):
    """
    Solve the SIR ODEs and return:
      - downsampled time/S/I/R arrays  (≤ 600 points for smooth Chart.js rendering)
      - key statistics
    """
    N   = population
    I0  = initial_infected
    S0  = N - I0
    R0s = 0

    # High-resolution solve
    t_full   = np.linspace(0, days, days * 20)
    solution = odeint(sir_model, (S0, I0, R0s), t_full, args=(beta, gamma, N))
    S_full, I_full, R_full = solution.T

    # Downsample to ≤ 600 points so the browser stays fast
    n_pts  = min(600, len(t_full))
    idx    = np.round(np.linspace(0, len(t_full) - 1, n_pts)).astype(int)
    t_ds   = t_full[idx]
    S_ds   = S_full[idx]
    I_ds   = I_full[idx]
    R_ds   = R_full[idx]

    # Statistics (computed on full-resolution data)
    peak_idx        = int(np.argmax(I_full))
    peak_day        = int(round(t_full[peak_idx]))
    peak_infected   = int(round(I_full[peak_idx]))
    total_recovered = int(round(R_full[-1]))
    r0              = round(beta / gamma, 2)

    # Day infection starts declining (first day where dI < 0)
    dI = np.diff(I_full)
    neg_idx = np.where(dI < 0)[0]
    decrease_start_day = int(round(t_full[neg_idx[0]])) if len(neg_idx) > 0 else peak_day

    # Day recovered population surpasses infected
    cross_idx = np.where(R_full > I_full)[0]
    recovery_dominant_day = int(round(t_full[cross_idx[0]])) if len(cross_idx) > 0 else days

    # Herd immunity threshold (fraction of population that needs to be immune)
    herd_immunity_pct = round((1 - 1 / r0) * 100, 1) if r0 > 1 else 0.0

    # Epidemic severity based on peak infected % of population
    peak_pct = peak_infected / N * 100
    if peak_pct < 5:
        severity_label = "Low"
    elif peak_pct < 20:
        severity_label = "Moderate"
    elif peak_pct < 50:
        severity_label = "High"
    else:
        severity_label = "Severe"

    peak_ds_idx = int(np.argmin(np.abs(t_ds - t_full[peak_idx])))

    return {
        # Chart data arrays
        'labels':    [round(float(v), 2) for v in t_ds],
        'S':         [round(float(v), 2) for v in S_ds],
        'I':         [round(float(v), 2) for v in I_ds],
        'R':         [round(float(v), 2) for v in R_ds],
        # Peak info for frontend annotation
        'peak_ds_idx':  peak_ds_idx,
        'peak_day_val': float(t_full[peak_idx]),
        # Stats
        'peak_day':       peak_day,
        'peak_infected':  f'{peak_infected:,}',
        'total_recovered': f'{total_recovered:,}',
        'r0':             r0,
        # AI Insights extras
        'decrease_start_day':    decrease_start_day,
        'recovery_dominant_day': recovery_dominant_day,
        'herd_immunity_pct':     herd_immunity_pct,
        'severity_label':        severity_label,
        'peak_pct':              round(peak_pct, 1),
    }


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/simulate', methods=['POST'])
def simulate():
    try:
        data = request.get_json()

        population       = int(data['population'])
        initial_infected = int(data['initial_infected'])
        beta             = float(data['beta'])
        gamma            = float(data['gamma'])
        days             = int(data['days'])

        if population <= 0 or initial_infected <= 0:
            return jsonify({'error': 'Population and initial infected must be positive.'}), 400
        if initial_infected >= population:
            return jsonify({'error': 'Initial infected must be less than total population.'}), 400
        if not (0 < beta <= 10):
            return jsonify({'error': 'Infection rate (β) must be between 0 and 10.'}), 400
        if not (0 < gamma <= 10):
            return jsonify({'error': 'Recovery rate (γ) must be between 0 and 10.'}), 400
        if not (1 <= days <= 3650):
            return jsonify({'error': 'Days must be between 1 and 3650.'}), 400

        result = run_simulation(population, initial_infected, beta, gamma, days)
        return jsonify(result)

    except (KeyError, ValueError, TypeError) as e:
        return jsonify({'error': f'Invalid input: {str(e)}'}), 400
    except Exception as e:
        return jsonify({'error': f'Simulation failed: {str(e)}'}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)
