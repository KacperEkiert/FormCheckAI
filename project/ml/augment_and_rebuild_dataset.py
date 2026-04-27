import json
import math
import random

def calculate_angle_3d(a, b, c):
    ba = [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
    bc = [c[0] - b[0], c[1] - b[1], c[2] - b[2]]
    dot = ba[0]*bc[0] + ba[1]*bc[1] + ba[2]*bc[2]
    norm_ba = math.hypot(math.hypot(ba[0], ba[1]), ba[2])
    norm_bc = math.hypot(math.hypot(bc[0], bc[1]), bc[2])
    if norm_ba == 0 or norm_bc == 0: return 0.0
    cosine_angle = max(min(dot / (norm_ba * norm_bc), 1.0), -1.0)
    return math.acos(cosine_angle) * 180.0 / math.pi

def rotate_y(lm, angle_deg):
    angle_rad = math.radians(angle_deg)
    cos_a = math.cos(angle_rad)
    sin_a = math.sin(angle_rad)
    x = lm[0] * cos_a + lm[2] * sin_a
    y = lm[1]
    z = -lm[0] * sin_a + lm[2] * cos_a
    return (x, y, z)

def process_frame(old_features, rot_angle=0):
    def get_lm(idx):
        return (old_features[idx*4], old_features[idx*4+1], old_features[idx*4+2])

    lms = [get_lm(i) for i in range(12)]
    if rot_angle != 0:
        lms = [rotate_y(lm, rot_angle) for lm in lms]

    shoulderLeft, shoulderRight = lms[0], lms[1]
    hipLeft, hipRight = lms[2], lms[3]
    kneeLeft, kneeRight = lms[4], lms[5]
    ankleLeft, ankleRight = lms[6], lms[7]
    heelLeft, heelRight = lms[8], lms[9]
    toeLeft, toeRight = lms[10], lms[11]

    kneeL = calculate_angle_3d(hipLeft, kneeLeft, ankleLeft) / 180.0
    kneeR = calculate_angle_3d(hipRight, kneeRight, ankleRight) / 180.0
    hipL = calculate_angle_3d(shoulderLeft, hipLeft, kneeLeft) / 180.0
    hipR = calculate_angle_3d(shoulderRight, hipRight, kneeRight) / 180.0
    ankleL = calculate_angle_3d(kneeLeft, ankleLeft, toeLeft) / 180.0
    ankleR = calculate_angle_3d(kneeRight, ankleRight, toeRight) / 180.0

    pelvis = (
        (hipLeft[0] + hipRight[0]) / 2,
        (hipLeft[1] + hipRight[1]) / 2,
        (hipLeft[2] + hipRight[2]) / 2
    )
    neck = (
        (shoulderLeft[0] + shoulderRight[0]) / 2,
        (shoulderLeft[1] + shoulderRight[1]) / 2,
        (shoulderLeft[2] + shoulderRight[2]) / 2
    )
    vertical = (pelvis[0], pelvis[1] - 1, pelvis[2])
    torsoLean = calculate_angle_3d(neck, pelvis, vertical) / 180.0

    kneeDist = math.hypot(math.hypot(kneeLeft[0] - kneeRight[0], kneeLeft[1] - kneeRight[1]), kneeLeft[2] - kneeRight[2])
    hipDist = math.hypot(math.hypot(hipLeft[0] - hipRight[0], hipLeft[1] - hipRight[1]), hipLeft[2] - hipRight[2])
    valgusIndex = (kneeDist / hipDist) if hipDist > 0 else 1.0

    torsoSize = math.hypot(math.hypot(pelvis[0] - neck[0], pelvis[1] - neck[1]), pelvis[2] - neck[2])
    if torsoSize == 0: torsoSize = 1.0

    heelLiftL = (heelLeft[1] - toeLeft[1]) / torsoSize
    heelLiftR = (heelRight[1] - toeRight[1]) / torsoSize

    avgKneeY = (kneeLeft[1] + kneeRight[1]) / 2
    depthIndex = (pelvis[1] - avgKneeY) / torsoSize

    # --- Nowe Cechy Holistyczne (Zgodnie z ExerciseModel.js) ---
    
    # 1. Wskaźnik Kompresji (Aspect Ratio)
    shoulderWidth = abs(shoulderLeft[0] - shoulderRight[0])
    bodyHeight = abs(pelvis[1] - neck[1])
    compressionRatio = shoulderWidth / bodyHeight if bodyHeight > 0 else 1.0

    # 2. Środek Ciężkości (Balance)
    footCenterX = (toeLeft[0] + toeRight[0]) / 2
    balanceShift = pelvis[0] - footCenterX

    # 3. Symetria (Symmetry Index)
    hipSymmetry = abs(hipLeft[1] - hipRight[1]) / torsoSize

    return [
        round(kneeL, 6), round(kneeR, 6),
        round(hipL, 6), round(hipR, 6),
        round(ankleL, 6), round(ankleR, 6),
        round(torsoLean, 6), round(valgusIndex, 6),
        round(heelLiftL, 6), round(heelLiftR, 6),
        round(depthIndex, 6),
        # Nowe cechy (12, 13, 14)
        round(compressionRatio, 6),
        round(balanceShift, 6),
        round(hipSymmetry, 6)
    ]

input_path = r"c:\Users\Kacpe\Desktop\Practisy pzdr\FormCheckAI\project\ml\training_data\trening_squat.json"
output_path = r"c:\Users\Kacpe\Desktop\Practisy pzdr\FormCheckAI\project\ml\training_data\trening_squat_3d_augmented.json"

print("Ładowanie oryginalnych danych (przodem)...")
with open(input_path, "r", encoding="utf-8") as f:
    data = json.load(f)

new_frames = []
print("Augmentacja 3D (obroty symulujące kamerę z boku)...")

angles_to_simulate = [0, 45, -45, 90, -90, 30, -30]

for frame in data.get("frames", []):
    old_feats = frame.get("features", [])
    if len(old_feats) >= 48:
        for angle in angles_to_simulate:
            new_feats = process_frame(old_feats, rot_angle=angle)
            new_frames.append({
                "features": new_feats,
                "labels": frame["labels"],
                "frame": frame.get("frame", 0)
            })

data["frames"] = new_frames
data["totalFrames"] = len(new_frames)
data["featuresCount"] = 14

print(f"Zapisywanie {len(new_frames)} zaugmentowanych klatek...")
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(data, f, separators=(",", ":"))
print("Gotowe!")
