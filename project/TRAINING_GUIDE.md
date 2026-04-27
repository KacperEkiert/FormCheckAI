# 🏋️ Przewodnik Trenowania FormCheckAI

Ten dokument wyjaśnia, jak rozbudować system o nowe ćwiczenia i jak poprawnie przygotować dane dla sztucznej inteligencji.

## 1. Proces Zbierania Danych (Data Collection)

System wykorzystuje tzw. **Supervised Learning** (Uczenie Nadzorowane). Oznacza to, że musisz "pokazać" modelowi, jak wygląda poprawne ćwiczenie oraz jak wyglądają konkretne błędy.

### Jak nagrywać?
1. Otwórz panel **Data Collector** w aplikacji.
2. Wybierz rodzaj ćwiczenia z listy (np. Pompki).
3. Kliknij **"Nagrywaj JSON"**.
4. Podczas ćwiczenia:
   - Jeśli robisz powtórzenie **idealnie**, nie klikaj żadnych przycisków błędów.
   - Jeśli robisz błąd (np. odrywasz pięty), **przytrzymaj odpowiedni przycisk** (np. `heels_up`) w momencie, gdy błąd występuje.
5. Po zakończeniu kliknij **"Zapisz i Eksportuj"**. Plik zostanie pobrany jako `trening_[id].json` i wysłany do bazy Supabase.

---

## 2. Słownik Etykiet (Co oznaczają błędy?)

Każde ćwiczenie ma swój zestaw etykiet. Poniżej znajdziesz ich definicje:

### 🦵 Przysiad (`squat`)
*   `valgus`: Kolana schodzą się do środka (tzw. "uciekanie kolan").
*   `lean`: Zbyt mocne pochylenie tułowia do przodu (plecy nie są pod odpowiednim kątem).
*   `shallow`: Przysiad jest zbyt płytki (brak osiągnięcia kąta prostego).
*   `heels_up`: Pięty odrywają się od podłoża.

### 🤸 Pompki (`pushup`)
*   `złe_plecy`: Plecy "wiszą" (lordoza) lub są zbyt wypchnięte w górę (koci grzbiet).
*   `szerokie_łokcie`: Łokcie uciekają na boki (kąt 90° od tułowia), co obciąża barki.
*   `płytko`: Klatka piersiowa nie schodzi wystarczająco nisko.
*   `góra` / `dół`: Etykiety pomocnicze do nauki fazy ruchu (opcjonalne).

### 🚶 Wykroki (`lunge`)
*   `krótki_krok`: Wykrok jest za krótki, co uniemożliwia poprawne zgięcie kolan.
*   `kolano_przód`: Kolano nogi wykrocznej wychodzi zbyt daleko przed linię palców.
*   `brak_balansu`: Chwianie się na boki podczas schodzenia w dół.

### 🦅 Pajacyki (`jumping_jacks`)
*   `asymetria`: Ręce lub nogi nie poruszają się w tym samym tempie/zasięgu.
*   `krótkie_ręce`: Ręce nie spotykają się nad głową (niepełny zakres ruchu).

---

## 3. Trenowanie Modelu

Gdy masz już zebrane pliki JSON (minimum 20-30 powtórzeń na każde ćwiczenie, w tym połowa to błędy), możesz przystąpić do treningu.

### Metoda A: Skrypt Python (`ml/train_squat_classifier.py`)
Skrypt ten można dostosować do każdego ćwiczenia:
1. Wczytuje pliki JSON z folderu treningowego.
2. Wyciąga cechy (kąty i odległości między stawami).
3. Tworzy plik `model.json` (dla TensorFlow.js).

### Metoda B: Panel w Aplikacji (Wkrótce)
W planach jest przycisk "Trenuj online", który wykorzysta bibliotekę `tfjs` bezpośrednio w przeglądarce, aby stworzyć model bez użycia Pythona.

---

## 4. Dobre Praktyki
- **Różnorodność:** Nagrywaj się w różnych ubraniach i na różnym tle. Dzięki temu AI nauczy się rozpoznawać sylwetkę, a nie tło.
- **Kąt kamery:** Najlepiej nagrywać się z boku (profil) lub pod kątem 45 stopni.
- **Czystość danych:** Jeśli pomyliłeś się podczas klikania błędu, lepiej usuń to nagranie i zrób je jeszcze raz. AI uczy się na Twoich oznaczeniach!
