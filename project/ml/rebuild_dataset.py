import json
import math

def calculate_angle_3d(a, b, c):
    ba = [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
    bc = [c[0] - b[0], c[1] - b[1], c[2] - b[2]]
    dot = ba[0]*bc[0] + ba[1]*bc[1] + ba[2]*bc[2]
    norm_ba = math.hypot(math.hypot(ba[0], ba[1]), ba[2])
    norm_bc = math.hypot(math.hypot(bc[0], bc[1]), bc[2])
    if norm_ba == 0 or norm_bc == 0: return 0.0
    cosine_angle = max(min(dot / (norm_ba * norm_bc), 1.0), -1.0)
    return math.acos(cosine_angle) * 180.0 / math.pi

def process_frame(old_features):
    def get_lm(idx):
        return (old_features[idx*4], old_features[idx*4+1], old_features[idx*4+2])

    shoulderLeft = get_lm(0)
    shoulderRight = get_lm(1)
    hipLeft = get_lm(2)
    hipRight = get_lm(3)
    kneeLeft = get_lm(4)
    kneeRight = get_lm(5)
    ankleLeft = get_lm(6)
    ankleRight = get_lm(7)
    heelLeft = get_lm(8)
    heelRight = get_lm(9)
    toeLeft = get_lm(10)
    toeRight = get_lm(11)

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

files_to_process = [
    ("trening_squat.json", "trening_squat_3d.json"),
    ("trening_squat.json", "trening_squat_3d_lite.json"),
    ("trening_squat.json", "trening_squat_3d_augmented.json")
]

for in_name, out_name in files_to_process:
    input_path = f"c:\\Users\\Kacpe\\Desktop\\Practisy pzdr\\FormCheckAI\\project\\ml\\training_data\\{in_name}"
    output_path = f"c:\\Users\\Kacpe\\Desktop\\Practisy pzdr\\FormCheckAI\\project\\ml\\training_data\\{out_name}"

    if in_name == out_name: continue

    print(f"Loading {in_name}...")
    try:
        with open(input_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        print(f"Processing {out_name}...")
        for frame in data.get("frames", []):
            old_feats = frame.get("features", [])
            if len(old_feats) >= 48:
                frame["features"] = process_frame(old_feats)
        
        data["featuresCount"] = 14
        
        print(f"Saving {out_name}...")
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, separators=(",", ":"))
    except Exception as e:
        print(f"Error processing {in_name}: {e}")

print("Batch Done!")
