import numpy as np
import os

def load_all_npy_files(folder_path):
    data_dict = {}
    
    # Sprawdzenie, czy ścieżka istnieje
    if not os.path.exists(folder_path):
        print(f"Błąd: Folder '{folder_path}' nie istnieje.")
        return None

    # Przechodzenie przez wszystkie pliki w folderze
    for filename in os.listdir(folder_path):
        if filename.endswith(".npy"):
            file_path = os.path.join(folder_path, filename)
            try:
                # Wczytanie pliku
                data = np.load(file_path)
                data_dict[filename] = data
                print(f"Pomyślnie wczytano: {filename} (Kształt: {data.shape})")
            except Exception as e:
                print(f"Nie udało się wczytać {filename}: {e}")
    
    return data_dict

# --- PRZYKŁAD UŻYCIA ---
path = input("Podaj ścieżkę do folderu: ")
all_arrays = load_all_npy_files(path)

if all_arrays:
    print(f"\nŁącznie wczytano plików: {len(all_arrays)}")
    # Przykład dostępu: all_arrays['nazwa_pliku.npy']