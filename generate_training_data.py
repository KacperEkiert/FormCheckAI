"""
=============================================================
  FormCheckAI – Generator Danych Treningowych z Benchmarku
=============================================================
Przetwarza wideo MP4 z datasetu QEVD-FIT-COACH-Benchmark,
wyciąga landmarki pozy (MediaPipe Tasks API), oblicza cechy
identycznie jak ExerciseModel.extractFeatures() w aplikacji,
i zapisuje pliki JSON gotowe do trenowania modelu.

Wymagania:
  pip install mediapipe opencv-python numpy

Użycie:
  python generate_training_data.py
"""

import cv2
import mediapipe as mp
import numpy as np
import json
import os
import math
import sys
import urllib.request
from pathlib import Path

# Fix Windows console encoding
sys.stdout.reconfigure(encoding='utf-8')

# ============================================================
# KONFIGURACJA
# ============================================================

BENCHMARK_DIR = r"C:\Users\Kacpe\Desktop\QEVD-FIT-COACH-Benchmark\QEVD-FIT-COACH-Benchmark"
VIDEOS_DIR = os.path.join(BENCHMARK_DIR, "long_range_videos")
FEEDBACKS_FILE = os.path.join(BENCHMARK_DIR, "feedbacks_long_range.json")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "project", "ml", "training_data")

# Ścieżka do modelu MediaPipe Pose
MODEL_PATH = os.path.join(os.path.dirname(__file__), "pose_landmarker_heavy.task")
MODEL_URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/latest/pose_landmarker_heavy.task"

# Ćwiczenia zaimplementowane w aplikacji
SUPPORTED_EXERCISES = {'squat', 'pushup', 'lunge', 'jumping_jacks'}

# Landmarki używane przez ExerciseModel.extractFeatures() w JS
KEY_LANDMARKS = [11, 12, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]

# Co ile klatek próbkować (nie każda klatka – wideo ma ~30fps, wystarczy co 3-5)
FRAME_SAMPLE_RATE = 3

# ============================================================
# POBIERANIE MODELU
# ============================================================

def download_model():
    """Pobiera model MediaPipe Pose jeśli nie istnieje."""
    if os.path.exists(MODEL_PATH):
        print(f"✅ Model już pobrany: {MODEL_PATH}")
        return
    
    print(f"⬇️  Pobieranie modelu Pose Landmarker (~30MB)...")
    urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
    print(f"✅ Model pobrany: {MODEL_PATH}")

# ============================================================
# MAPOWANIE WIDEO -> ĆWICZENIE
# ============================================================

def detect_exercise_from_feedbacks(feedbacks):
    """Rozpoznaje typ ćwiczenia na podstawie komentarzy trenera."""
    text = " ".join([f.lower() for f in feedbacks if f])
    
    if 'squat' in text:
        return 'squat'
    if 'push up' in text or 'push-up' in text or 'pushup' in text:
        return 'pushup'
    if 'lunge' in text:
        return 'lunge'
    if 'jumping jack' in text:
        return 'jumping_jacks'
    
    return None


# ============================================================
# EKSTRAKCJA CECH (identyczna z ExerciseModel.extractFeatures)
# ============================================================

# ============================================================
# EKSTRAKCJA CECH (identyczna z ExerciseModel.extractFeatures)
# ============================================================

def calculate_angle_3d(a, b, c):
    """Oblicza prawdziwy kąt 3D między wektorami."""
    ba = [a.x - b.x, a.y - b.y, a.z - b.z]
    bc = [c.x - b.x, c.y - b.y, c.z - b.z]
    dot = ba[0]*bc[0] + ba[1]*bc[1] + ba[2]*bc[2]
    norm_ba = math.hypot(math.hypot(ba[0], ba[1]), ba[2])
    norm_bc = math.hypot(math.hypot(bc[0], bc[1]), bc[2])
    if norm_ba == 0 or norm_bc == 0: return 0.0
    cosine_angle = max(min(dot / (norm_ba * norm_bc), 1.0), -1.0)
    return math.acos(cosine_angle) * 180.0 / math.pi

def extract_features(landmarks):
    """
    Ekstrakcja w pełni inwariantnych przestrzennie (3D) cech geometrycznych,
    niezależnych od obrócenia kamery czy perspektywy. Zwraca 11 cech.
    """
    if not landmarks or len(landmarks) < 33:
        return None

    shoulderLeft = landmarks[11]
    shoulderRight = landmarks[12]
    hipLeft = landmarks[23]
    hipRight = landmarks[24]
    kneeLeft = landmarks[25]
    kneeRight = landmarks[26]
    ankleLeft = landmarks[27]
    ankleRight = landmarks[28]
    heelLeft = landmarks[29]
    heelRight = landmarks[30]
    toeLeft = landmarks[31]
    toeRight = landmarks[32]

    kneeL = calculate_angle_3d(hipLeft, kneeLeft, ankleLeft)
    kneeR = calculate_angle_3d(hipRight, kneeRight, ankleRight)
    hipL = calculate_angle_3d(shoulderLeft, hipLeft, kneeLeft)
    hipR = calculate_angle_3d(shoulderRight, hipRight, kneeRight)
    ankleL = calculate_angle_3d(kneeLeft, ankleLeft, toeLeft)
    ankleR = calculate_angle_3d(kneeRight, ankleRight, toeRight)

    pelvis_x = (hipLeft.x + hipRight.x) / 2
    pelvis_y = (hipLeft.y + hipRight.y) / 2
    pelvis_z = (hipLeft.z + hipRight.z) / 2
    
    neck_x = (shoulderLeft.x + shoulderRight.x) / 2
    neck_y = (shoulderLeft.y + shoulderRight.y) / 2
    neck_z = (shoulderLeft.z + shoulderRight.z) / 2

    # Obiekt udający landmark dla punktów wirtualnych
    class Point3D:
        def __init__(self, x, y, z):
            self.x = x; self.y = y; self.z = z

    pelvis = Point3D(pelvis_x, pelvis_y, pelvis_z)
    neck = Point3D(neck_x, neck_y, neck_z)
    vertical = Point3D(pelvis_x, pelvis_y - 1, pelvis_z)
    
    torsoLean = calculate_angle_3d(neck, pelvis, vertical)

    kneeDist = math.hypot(math.hypot(kneeLeft.x - kneeRight.x, kneeLeft.y - kneeRight.y), kneeLeft.z - kneeRight.z)
    hipDist = math.hypot(math.hypot(hipLeft.x - hipRight.x, hipLeft.y - hipRight.y), hipLeft.z - hipRight.z)
    valgusIndex = (kneeDist / hipDist) if hipDist > 0 else 1.0

    torsoSize = math.hypot(math.hypot(pelvis_x - neck_x, pelvis_y - neck_y), pelvis_z - neck_z)
    if torsoSize == 0: torsoSize = 1.0

    heelLiftL = (heelLeft.y - toeLeft.y) / torsoSize
    heelLiftR = (heelRight.y - toeRight.y) / torsoSize

    avgKneeY = (kneeLeft.y + kneeRight.y) / 2
    depthIndex = (pelvis_y - avgKneeY) / torsoSize

    return [
        kneeL / 180.0,
        kneeR / 180.0,
        hipL / 180.0,
        hipR / 180.0,
        ankleL / 180.0,
        ankleR / 180.0,
        torsoLean / 180.0,
        valgusIndex,
        heelLiftL,
        heelLiftR,
        depthIndex
    ]


# ============================================================
# GŁÓWNA LOGIKA
# ============================================================

def process_video(video_path, exercise_id, feedbacks, landmarker):
    """Przetwarza wideo i etykietuje błędy."""
    print(f"\n  📹 Przetwarzanie: {os.path.basename(video_path)} ({exercise_id})")
    
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened(): return None

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    
    temp_frames = []
    frame_idx = 0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret: break

        if frame_idx % FRAME_SAMPLE_RATE == 0:
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            timestamp_ms = int((frame_idx / fps) * 1000) if fps > 0 else frame_idx * 33

            try:
                results = landmarker.detect_for_video(mp_image, timestamp_ms)
            except: continue

            if results.pose_landmarks:
                landmarks = results.pose_landmarks[0]
                features = extract_features(landmarks)

                if features:
                    text = feedbacks[frame_idx].lower() if feedbacks and frame_idx < len(feedbacks) and feedbacks[frame_idx] else ""
                    labels = {"correct": True, "shallow": False, "lean": False, "valgus": False, "heels_up": False}
                    
                    error_found = None
                    if exercise_id == 'squat' and text:
                        if any(w in text for w in ['shallow', 'deeper', 'lower', 'depth', 'not deep']):
                            error_found = 'shallow'
                        elif any(w in text for w in ['lean', 'back', 'posture', 'rounded', 'forward', 'straight']):
                            error_found = 'lean'
                        elif any(w in text for w in ['knee', 'valgus', 'together', 'inward']):
                            error_found = 'valgus'
                        elif any(w in text for w in ['heel', 'toe', 'foot', 'feet']):
                            error_found = 'heels_up'
                    
                    if error_found:
                        # Lookback: oznacz poprzednie klatki ruchu (2.5 sekundy)
                        lookback = int(2.5 * (fps or 30) / FRAME_SAMPLE_RATE)
                        for i in range(max(0, len(temp_frames) - lookback), len(temp_frames)):
                            temp_frames[i]['labels'][error_found] = True
                            temp_frames[i]['labels']['correct'] = False
                        labels[error_found] = True
                        labels['correct'] = False

                    temp_frames.append({
                        "features": [round(f, 6) for f in features],
                        "labels": labels,
                        "frame": frame_idx
                    })

        frame_idx += 1
        if frame_idx % 1000 == 0: print(f"     Postęp: {(frame_idx/total_frames)*100:.0f}%...")

    cap.release()

    # Zwracamy wszystkie klatki, balansowanie zrobimy na poziomie całego zbioru ćwiczenia
    return temp_frames


def main():
    print("=" * 60)
    print("  FormCheckAI – Generator Danych Treningowych")
    print("=" * 60)

    # Pobierz model jeśli trzeba
    download_model()

    # Wczytaj feedbacki
    if not os.path.exists(FEEDBACKS_FILE):
        print(f"❌ Nie znaleziono pliku feedbacków: {FEEDBACKS_FILE}")
        sys.exit(1)

    with open(FEEDBACKS_FILE, 'r', encoding='utf-8') as f:
        all_feedbacks = json.load(f)

    print(f"\n📁 Znaleziono {len(all_feedbacks)} wideo w benchmarku")

    # Utwórz folder wyjściowy
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Mapuj wideo na ćwiczenia
    exercise_videos = {}
    for entry in all_feedbacks:
        video_file = entry['long_range_video_file'].split('/')[-1]
        video_id = video_file.replace('.mp4', '')
        exercise = detect_exercise_from_feedbacks(entry['feedbacks'])

        if exercise and exercise in SUPPORTED_EXERCISES:
            if exercise not in exercise_videos:
                exercise_videos[exercise] = []
            exercise_videos[exercise].append({
                'id': video_id,
                'path': os.path.join(VIDEOS_DIR, video_file),
                'feedbacks': entry['feedbacks']
            })

    print("\n📊 Znalezione ćwiczenia:")
    for ex, vids in exercise_videos.items():
        print(f"   {ex}: {len(vids)} wideo")

    # Inicjalizacja MediaPipe PoseLandmarker (Tasks API)
    BaseOptions = mp.tasks.BaseOptions
    PoseLandmarker = mp.tasks.vision.PoseLandmarker
    PoseLandmarkerOptions = mp.tasks.vision.PoseLandmarkerOptions
    RunningMode = mp.tasks.vision.RunningMode

    options = PoseLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=MODEL_PATH),
        running_mode=RunningMode.VIDEO,
        num_poses=1,
        min_pose_detection_confidence=0.5,
        min_tracking_confidence=0.5
    )

    # Przetwarzaj każde ćwiczenie
    for exercise_id, videos in exercise_videos.items():
        print(f"\n{'='*60}")
        print(f"  🏋️ Przetwarzanie: {exercise_id.upper()} ({len(videos)} wideo)")
        print(f"{'='*60}")

        all_frames = []

        for video_info in videos:
            video_path = video_info['path']

            if not os.path.exists(video_path):
                print(f"  ⚠️ Pominięto (brak pliku): {video_path}")
                continue

            # Twórz nowy landmarker dla każdego wideo (reset stanu trackera)
            with PoseLandmarker.create_from_options(options) as landmarker:
                frames = process_video(
                    video_path,
                    exercise_id,
                    video_info['feedbacks'],
                    landmarker
                )

            if frames:
                all_frames.extend(frames)
                
                # Zapisuj postęp po każdym filmie
                output_file = os.path.join(OUTPUT_DIR, f"trening_{exercise_id}.json")
                output_data = {
                    "exerciseId": exercise_id,
                    "timestamp": "benchmark_import",
                    "totalFrames": len(all_frames),
                    "source": "QEVD-FIT-COACH-Benchmark",
                    "frames": all_frames
                }

                with open(output_file, 'w', encoding='utf-8') as f:
                    json.dump(output_data, f, ensure_ascii=False, indent=2)
                
                print(f"  💾 Zapisano postęp: {output_file} ({len(all_frames)} klatek)")

        if all_frames:
            # GLOBALNE BALANSOWANIE DLA ĆWICZENIA
            errors = [f for f in all_frames if not f['labels']['correct']]
            corrects = [f for f in all_frames if f['labels']['correct']]
            
            print(f"\n   📊 Statystyki surowe dla {exercise_id}:")
            print(f"      - Błędy: {len(errors)}")
            print(f"      - Poprawne: {len(corrects)}")
            
            # Dążymy do balansu 1:1.5 (więcej poprawnych jest OK, ale nie 1:100)
            target_correct_count = int(len(errors) * 1.5) if len(errors) > 0 else 500
            
            if len(corrects) > target_correct_count:
                print(f"      - Redukcja klatek poprawnych z {len(corrects)} do {target_correct_count}...")
                indices = np.linspace(0, len(corrects) - 1, target_correct_count, dtype=int)
                corrects = [corrects[i] for i in indices]
            
            final_data = errors + corrects
            np.random.shuffle(final_data) # Pomieszaj, aby model nie uczył się sekwencji wideo

            # Zapisz JSON w formacie kompatybilnym z aplikacją
            output_file = os.path.join(OUTPUT_DIR, f"trening_{exercise_id}.json")
            output_data = {
                "exerciseId": exercise_id,
                "timestamp": "benchmark_import",
                "totalFrames": len(final_data),
                "featuresCount": len(final_data[0]['features']) if final_data else 0,
                "source": "QEVD-FIT-COACH-Benchmark",
                "frames": final_data
            }

            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(output_data, f, ensure_ascii=False, indent=2)

            file_size = os.path.getsize(output_file) / (1024 * 1024)
            print(f"   💾 Zapisano FINALNY: {output_file}")
            print(f"      Rozmiar: {file_size:.1f} MB, Klatki: {len(final_data)} (Błędy: {len(errors)})")

    print(f"\n{'='*60}")
    print(f"  ✅ ZAKOŃCZONO!")
    print(f"  Pliki zapisane w: {OUTPUT_DIR}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
