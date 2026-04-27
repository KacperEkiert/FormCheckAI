import json
import os

input_path = r"c:\Users\Kacpe\Desktop\Practisy pzdr\FormCheckAI\project\ml\training_data\trening_squat_3d_augmented.json"
output_path = r"c:\Users\Kacpe\Desktop\Practisy pzdr\FormCheckAI\project\ml\training_data\trening_squat_3d_lite.json"

if not os.path.exists(input_path):
    print(f"Błąd: Nie znaleziono pliku {input_path}")
    exit(1)

print("Wczytywanie dużego pliku (może to chwilę potrwać)...")
with open(input_path, "r", encoding="utf-8") as f:
    data = json.load(f)

old_count = len(data["frames"])
# Pobieramy co 6. klatkę dla wersji lite
data["frames"] = data["frames"][::6]
data["totalFrames"] = len(data["frames"])

print(f"Zredukowano liczbę klatek z {old_count} do {data['totalFrames']}")
print(f"Zapisywanie wersji LITE: {output_path}")

with open(output_path, "w", encoding="utf-8") as f:
    json.dump(data, f, separators=(",", ":"))

size_mb = os.path.getsize(output_path) / (1024 * 1024)
print(f"Sukces! Nowy plik ma rozmiar: {size_mb:.2f} MB")
