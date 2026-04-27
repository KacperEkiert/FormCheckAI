/**
 * Parametry detekcji techniki ćwiczeń (Magic Numbers)
 * Tutaj możesz łatwo dostosować czułość algorytmów bez szukania w kodzie hooków.
 */
export const DETECTION_PARAMS = {
    // --- OGÓLNE ---
    REP_COOLDOWN_MS: 1000,             // Czas blokady po zaliczeniu powtórzenia (ms)
    MIN_VISIBILITY_THRESHOLD: 0.65,    // Próg widoczności landmarków (0-1)
    LOW_FPS_THRESHOLD: 15,             // Próg uznawany za niską płynność kamery

    // --- PRZYSIADY (SQUAT) ---
    SQUAT: {
        PHASE_KNEE_ANGLE: 162,         // Kąt w kolanie, powyżej którego uznajemy, że faza się zaczęła
        REP_DOWN_ANGLE: 90,            // Kąt w kolanie uznawany za "dół" przysiadu
        REP_UP_ANGLE: 160,             // Kąt w kolanie uznawany za powrót do góry
        DEPTH_WARNING_ANGLE: 100,      // Powyżej tego kąta w dole przysiad jest uznawany za płytki
        DEPTH_PERFECT_ANGLE: 85,       // Poniżej tego kąta przysiad jest uznawany za głęboki (perfekcyjny)
        
        // Plecy (Back Lean)
        BACK_LEAN_MAX: 40,             // Maksymalny kąt pochylenia tułowia (stopnie)
        BACK_LEAN_WARNING: 40,         // Kąt, od którego zaczynamy ostrzegać o plecach
        BACK_ROUNDED_ANGLE: 160,       // Kąt "garbienia się" (głowa-bark-biodro)
        
        // Pięty (Heel Lift)
        HEEL_LIFT_THRESHOLD_Y: 0.03,   // Próg pionowego przesunięcia kostki względem stopy
        HEEL_LIFT_THRESHOLD_DIFF: 0.01, // Czułość relacji pięta-palce
        HEEL_LIFT_FRAMES_REQUIRED: 18,  // Ile klatek błąd musi trwać, by go zgłosić
        HEEL_LIFT_SENSITIVITY: 0.055    // Dodatkowy margines dla detekcji 3D (im mniej, tym czulsze)
    },

    // --- POMPKI (PUSHUP) ---
    PUSHUP: {
        DOWN_ANGLE: 100,
        UP_ANGLE: 155,
        DEEP_ANGLE: 85
    },

    // --- WYKROKI (LUNGE) ---
    LUNGE: {
        DOWN_ANGLE: 100,
        UP_ANGLE: 150,
        DEEP_ANGLE: 95
    },

    // --- PAJACYKI (JUMPING JACKS) ---
    JUMPING_JACKS: {
        DOWN_ANGLE: 40,
        UP_ANGLE: 140,
        DEEP_ANGLE: 150
    }
};
