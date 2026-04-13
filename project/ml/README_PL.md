# Trening klasyfikatora bledow przysiadu

Ten katalog sluzy do "dotrenowania" logiki oceny techniki na bazie danych zebranych w aplikacji.

## 1) Zbieranie danych w aplikacji

W widoku kamery:
- kliknij `Start Dataset`,
- wykonaj serie poprawnych i blednych przysiadow,
- kliknij `Stop Dataset`,
- kliknij `Export JSON`.

Wyeksportowane pliki JSON przenies do jednego folderu, np. `ml/data`.

## 2) Instalacja zaleznosci

```bash
pip install -r ml/requirements.txt
```

## 3) Trening modelu

```bash
python ml/train_squat_classifier.py --input-dir ml/data --out-model ml/models/squat_error_model.joblib
```

Skrypt:
- laczy wszystkie JSON-y z `--input-dir`,
- trenuje wieloetykietowy model (`valgus`, `lean`, `shallow`, `toes`),
- wypisuje raport jakosci na zbiorze testowym,
- zapisuje model `.joblib`.

## 4) Jak poprawiac dokladnosc

- Zbieraj dane z roznych kamer i oswietlenia.
- Zadbaj o balans etykiet (nie tylko "poprawne").
- Dodaj dane od wielu osob (wzrost, sylwetka, zakres ruchu).
- Powtarzaj trening po kazdej nowej paczce danych.
# Trening klasyfikatora bledow przysiadu

Ten katalog sluzy do "dotrenowania" logiki oceny techniki na bazie danych zebranych w aplikacji.

## 1) Zbieranie danych w aplikacji

W widoku kamery:
- kliknij `Start Dataset`,
- wykonaj serie poprawnych i blednych przysiadow,
- kliknij `Stop Dataset`,
- kliknij `Export JSON`.

Wyeksportowane pliki JSON przenies do jednego folderu, np. `ml/data`.

## 2) Instalacja zaleznosci

```bash
pip install -r ml/requirements.txt
```

## 3) Trening modelu

```bash
python ml/train_squat_classifier.py --input-dir ml/data --out-model ml/models/squat_error_model.joblib
```

Skrypt:
- laczy wszystkie JSON-y z `--input-dir`,
- trenuje wieloetykietowy model (`valgus`, `lean`, `shallow`, `toes`),
- wypisuje raport jakosci na zbiorze testowym,
- zapisuje model `.joblib`.

## 4) Jak poprawiac dokladnosc

- Zbieraj dane z roznych kamer i oswietlenia.
- Zadbaj o balans etykiet (nie tylko "poprawne").
- Dodaj dane od wielu osob (wzrost, sylwetka, zakres ruchu).
- Powtarzaj trening po kazdej nowej paczce danych.
