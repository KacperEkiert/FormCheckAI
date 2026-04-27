import * as tf from '@tensorflow/tfjs';

// Key landmarks to use (excluding face and hands for better generalization)
const KEY_LANDMARKS = [
  11, 12, // shoulders
  23, 24, // hips
  25, 26, // knees
  27, 28, // ankles
  29, 30, // heels
  31, 32  // toes
];

export class ExerciseModel {
  constructor() {
    this.model = null;
    // Expanded labels for better exercise orchestration
    this.labels = ['valgus', 'lean', 'shallow', 'heels_up', 'correct', 'up', 'down'];
    this.isTraining = false;
  }

  // Extracts features from mediapipe landmarks
  static extractFeatures(landmarks) {
    if (!landmarks || landmarks.length < 33) return null;

    const calculateAngle3D = (a, b, c) => {
      const ba = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
      const bc = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };
      const dot = ba.x * bc.x + ba.y * bc.y + ba.z * bc.z;
      const normBa = Math.hypot(ba.x, ba.y, ba.z);
      const normBc = Math.hypot(bc.x, bc.y, bc.z);
      if (normBa === 0 || normBc === 0) return 0;
      let cosineAngle = dot / (normBa * normBc);
      cosineAngle = Math.max(Math.min(cosineAngle, 1.0), -1.0);
      return (Math.acos(cosineAngle) * 180.0) / Math.PI;
    };

    const shoulderLeft = landmarks[11];
    const shoulderRight = landmarks[12];
    const hipLeft = landmarks[23];
    const hipRight = landmarks[24];
    const kneeLeft = landmarks[25];
    const kneeRight = landmarks[26];
    const ankleLeft = landmarks[27];
    const ankleRight = landmarks[28];
    const heelLeft = landmarks[29];
    const heelRight = landmarks[30];
    const toeLeft = landmarks[31];
    const toeRight = landmarks[32];

    const kneeL = calculateAngle3D(hipLeft, kneeLeft, ankleLeft);
    const kneeR = calculateAngle3D(hipRight, kneeRight, ankleRight);
    const hipL = calculateAngle3D(shoulderLeft, hipLeft, kneeLeft);
    const hipR = calculateAngle3D(shoulderRight, hipRight, kneeRight);
    const ankleL = calculateAngle3D(kneeLeft, ankleLeft, toeLeft);
    const ankleR = calculateAngle3D(kneeRight, ankleRight, toeRight);

    const pelvis = {
      x: (hipLeft.x + hipRight.x) / 2,
      y: (hipLeft.y + hipRight.y) / 2,
      z: (hipLeft.z + hipRight.z) / 2
    };
    const neck = {
      x: (shoulderLeft.x + shoulderRight.x) / 2,
      y: (shoulderLeft.y + shoulderRight.y) / 2,
      z: (shoulderLeft.z + shoulderRight.z) / 2
    };
    const vertical = { x: pelvis.x, y: pelvis.y - 1, z: pelvis.z };
    const torsoLean = calculateAngle3D(neck, pelvis, vertical);

    const kneeDist = Math.hypot(kneeLeft.x - kneeRight.x, kneeLeft.y - kneeRight.y, Math.abs(kneeLeft.z - kneeRight.z));
    const hipDist = Math.hypot(hipLeft.x - hipRight.x, hipLeft.y - hipRight.y, Math.abs(hipLeft.z - hipRight.z));
    const valgusIndex = hipDist > 0 ? kneeDist / hipDist : 1.0;

    const torsoSize = Math.hypot(pelvis.x - neck.x, pelvis.y - neck.y, pelvis.z - neck.z) || 1;
    const heelLiftL = (heelLeft.y - toeLeft.y) / torsoSize;
    const heelLiftR = (heelRight.y - toeRight.y) / torsoSize;

    const avgKneeY = (kneeLeft.y + kneeRight.y) / 2;
    const depthIndex = (pelvis.y - avgKneeY) / torsoSize;

    // --- Nowe Cechy Holistyczne (Poza Szkieletem) ---
    
    // 1. Wskaźnik Kompresji (Aspect Ratio) - wykrywa zapadanie się sylwetki
    const shoulderWidth = Math.abs(shoulderLeft.x - shoulderRight.x);
    const bodyHeight = Math.abs(pelvis.y - neck.y);
    const compressionRatio = bodyHeight > 0 ? shoulderWidth / bodyHeight : 1.0;

    // 2. Środek Ciężkości (Balance) - przesunięcie miednicy względem bazy stóp
    const footCenterX = (toeLeft.x + toeRight.x) / 2;
    const balanceShift = pelvis.x - footCenterX;

    // 3. Symetria (Symmetry Index) - różnica w obciążeniu bioder
    const hipSymmetry = Math.abs(hipLeft.y - hipRight.y) / torsoSize;

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
      depthIndex,
      // Dodane cechy holistyczne (łącznie 14 cech)
      compressionRatio,
      balanceShift,
      hipSymmetry
    ];
  }

  buildModel(inputSize, outputSize) {
    this.model = tf.sequential();
    
    this.model.add(tf.layers.dense({
      units: 128,
      activation: 'relu',
      inputShape: [inputSize]
    }));
    this.model.add(tf.layers.dropout({ rate: 0.3 }));
    
    this.model.add(tf.layers.dense({
      units: 64,
      activation: 'relu'
    }));
    this.model.add(tf.layers.dropout({ rate: 0.2 }));

    this.model.add(tf.layers.dense({
      units: outputSize,
      activation: 'sigmoid'
    }));

    this.model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });
  }

  // Augment dataset for low quality conditions (adds slight noise to features)
  augmentDataset(dataset, factor = 2) {
    const augmented = [];
    for (let item of dataset) {
      augmented.push(item); // Keep original
      if (item.features) {
        for (let i = 0; i < factor; i++) {
          let noisyFeatures = [...item.features];
          
          // Add slight noise to all features to prevent overfitting
          for (let j = 0; j < noisyFeatures.length; j++) {
            noisyFeatures[j] += (Math.random() - 0.5) * 0.05;
          }

          augmented.push({ features: noisyFeatures, labels: item.labels });
        }
      }
    }
    return augmented;
  }

  async train(dataset, onEpochEnd) {
    this.isTraining = true;
    
    // Augment dataset to improve robustness in bad conditions
    const augmentedDataset = this.augmentDataset(dataset, 2);

    const xData = [];
    const yData = [];

    for (let item of augmentedDataset) {
      if (item.features) {
        xData.push(item.features);
        const yRow = this.labels.map(label => item.labels[label] ? 1.0 : 0.0);
        yData.push(yRow);
      }
    }

    if (xData.length === 0) {
      this.isTraining = false;
      throw new Error("Dataset is empty");
    }

    const xs = tf.tensor2d(xData);
    const ys = tf.tensor2d(yData);

    if (!this.model) {
      this.buildModel(xData[0].length, this.labels.length);
    }

    await this.model.fit(xs, ys, {
      epochs: 50,
      validationSplit: 0.2,
      shuffle: true,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if (onEpochEnd) onEpochEnd(epoch, logs);
        }
      }
    });

    xs.dispose();
    ys.dispose();
    this.isTraining = false;
  }

  async predict(landmarks) {
    if (!this.model || !landmarks || this.isTraining) return null;
    
    const features = ExerciseModel.extractFeatures(landmarks);
    if (!features) return null;

    const xs = tf.tensor2d([features]);
    const predictions = this.model.predict(xs);
    const scores = await predictions.data();
    
    xs.dispose();
    predictions.dispose();

    const result = {};
    this.labels.forEach((label, idx) => {
      result[label] = scores[idx]; // Probability 0.0 - 1.0
    });
    return result;
  }

  async save(path) {
    if (this.model && path) {
      await this.model.save(path);
      // If it's localstorage, we also save labels there. 
      // On server, we might save a labels.json alongside.
      if (path.startsWith('localstorage://')) {
        localStorage.setItem(`${path}-labels`, JSON.stringify(this.labels));
      }
    }
  }

  async load(path = 'localstorage://exercise-model') {
    try {
      this.model = await tf.loadLayersModel(path);
      this.model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy']
      });

      if (path.startsWith('localstorage://')) {
        const labelsStr = localStorage.getItem(`${path}-labels`);
        if (labelsStr) this.labels = JSON.parse(labelsStr);
      } else {
        // Try to load labels.json from the same directory if not localstorage
        try {
          const labelsUrl = path.replace('model.json', 'labels.json');
          const response = await fetch(labelsUrl);
          if (response.ok) {
            this.labels = await response.json();
          }
        } catch (e) {
          console.warn("Could not load labels.json, using defaults", e);
        }
      }
      return true;
    } catch (e) {
      // Wyciszamy błąd, ponieważ useWorkoutDetection sam informuje o braku modelu
      return false;
    }
  }
}
