# 🏋️ Project: FormCheck AI – Twój Osobisty Trener 3D

## 📌 Wizja Projektu
Aplikacja fitness nowej generacji, która eliminuje barierę między skomplikowaną teorią treningową a praktyką. Zamiast przeszukiwać listy ćwiczeń, użytkownik komunikuje się z aplikacją poprzez interaktywny model 3D ludzkiego ciała.

## 📱 Interfejs i User Experience

### 1. Interaktywny Model 3D (Ekran Główny)
* **Nawigacja:** Centralnym punktem jest obracający się model anatomiczny postaci.
* **Wybór celu:** Użytkownik klika bezpośrednio w grupę mięśniową, którą chce trenować (np. klatka piersiowa, czworogłowe uda).
* **Akcja:** Po kliknięciu mięsień zostaje podświetlony, a system dynamicznie serwuje kartę z odpowiednim ćwiczeniem (np. kliknięcie w klatkę = Pompki).

### 2. Tryb Treningu (Analiza w czasie rzeczywistym)
Ekran zostaje podzielony funkcjonalnie:
* **Widok AI:** Podgląd z kamery frontowej z nałożonym "szkieletem" (punkty kluczowe ciała: stawy, głowa, kręgosłup).
* **Instruktaż:** Animacja lub wideo prezentujące wzorcową technikę wybranego ćwiczenia.

---

## ⚙️ Jak to działa "pod maską"?

### A. Frontend i Wizualizacja
* **Silnik 3D:** Renderowanie modelu człowieka (np. za pomocą Three.js lub Unity), umożliwiające mapowanie kliknięć na konkretne ID mięśni.
* **Interfejs:** Responsywny panel boczny z instrukcjami i metrykami.

### B. Computer Vision (Śledzenie ruchu)
* Wykorzystanie modeli takich jak **MediaPipe** lub **TensorFlow.js (PoseNet)** do wykrywania 33 punktów kluczowych ciała w czasie rzeczywistym.
* Zamiana obrazu wideo na matematyczny model współrzędnych $X, Y, Z$.

### C. Logika Korekty Błędów
Algorytmy obliczają kąty pomiędzy wektorami (np. kąt w stawie kolanowym podczas przysiadu).
* **Przykład:** Jeśli kąt w kolanie $\alpha > 90^\circ$ przy pełnym zejściu, a plecy odchylają się od pionu o więcej niż $20^\circ$, system wykrywa błąd techniczny.

### D. Generator Informacji Zwrotnej (NLP)
Warstwa AI tłumaczy surowe dane na ludzki język:
**"Zejdź niżej i wyprostuj plecy!"**

---

## 📊 Podsumowanie i Feedback
Po zakończeniu serii użytkownik otrzymuje czytelny raport:

| Metryka | Wynik | Komentarz |
| :--- | :--- | :--- |
| **Ogólna technika** | **75%** | Dobra stabilizacja, ale popracuj nad głębokością. |
| **Najczęstszy błąd** | Kolana do środka | Skup się na wypychaniu kolan na zewnątrz. |
| **Wskazówka** | Tempo | Spróbuj schodzić wolniej (faza ekscentryczna). |

---

## 🚀 Technologie
* **Frontend:** React / React Native.
* **3D:** Three.js / WebGL.
* **ML/AI:** MediaPipe (Pose Tracking).
* **Analiza danych:** Python / Node.js.

---

## 🚀 Plan MVP (Scope na 4 tygodnie / 5 osób)


### 🎯 Zakres funkcjonalny (Scope)
1.  **Ograniczenie modelu 3D:** Model wyświetla całe ciało, ale aktywny (klikalny) jest tylko **jeden obszar: Nogi**.
2.  **Jedno ćwiczenie:** System obsługuje wyłącznie **Przysiad (Squat)**. To pozwoli idealnie skalibrować matematykę wykrywania błędów.
3.  **Platforma:** Web (Przeglądarka desktopowa/mobilna).
4.  **Feedback:** Wyświetlanie prostych komunikatów tekstowych na ekranie z syntezą mowy oraz sterowaniem poprzez komunikaty glosowe


### 📅 Harmonogram (Milestones)
* **Tydzień 1:** Setup środowiska, wyświetlenie modelu 3D i odpalenie kamery z nałożonym szkieletem MediaPipe.
* **Tydzień 2:** Opracowanie matematyczne przysiadu – zdefiniowanie poprawnych kątów dla kolan i pleców.
* **Tydzień 3:** Połączenie "mózgu" (analizy) z interfejsem – wyświetlanie komunikatów "Zejdź niżej" na żywo.
* **Tydzień 4:** Ekran podsumowania treningu, poprawki błędów (bugfixing) i stabilizacja obrazu.

---

## ⚙️ Technologie (MVP Focus)
* **Core:** React.js (Frontend).
* **AI/Vision:** MediaPipe Pose (gotowy model, brak własnego trenowania sieci).
* **Graphics:** Three.js (prosty model niskopoligonowy - Low Poly).