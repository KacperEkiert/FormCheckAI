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
    this.labels = ['valgus', 'lean', 'shallow', 'heels_up'];
    this.isTraining = false;
  }

  // Extracts features from mediapipe landmarks
  static extractFeatures(landmarks) {
    if (!landmarks || landmarks.length < 33) return null;

    // Calculate center of hips (pelvis)
    const hipLeft = landmarks[23];
    const hipRight = landmarks[24];
    const pelvis = {
      x: (hipLeft.x + hipRight.x) / 2,
      y: (hipLeft.y + hipRight.y) / 2,
      z: (hipLeft.z + hipRight.z) / 2
    };

    // Calculate center of shoulders (neck)
    const shoulderLeft = landmarks[11];
    const shoulderRight = landmarks[12];
    const neck = {
      x: (shoulderLeft.x + shoulderRight.x) / 2,
      y: (shoulderLeft.y + shoulderRight.y) / 2,
      z: (shoulderLeft.z + shoulderRight.z) / 2
    };

    // Use torso length as scale unit
    const torsoSize = Math.hypot(pelvis.x - neck.x, pelvis.y - neck.y, pelvis.z - neck.z) || 1;

    let features = [];
    for (let i of KEY_LANDMARKS) {
      const lm = landmarks[i];
      features.push(
        (lm.x - pelvis.x) / torsoSize,
        (lm.y - pelvis.y) / torsoSize,
        (lm.z - pelvis.z) / torsoSize,
        lm.visibility || 0
      );
    }
    return features;
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

  // Augment dataset for low quality conditions (adds noise, drops random joints to simulate occlusion)
  augmentDataset(dataset, factor = 2) {
    const augmented = [];
    for (let item of dataset) {
      augmented.push(item); // Keep original
      if (item.features) {
        for (let i = 0; i < factor; i++) {
          let noisyFeatures = [...item.features];
          // Each feature is 4 values: x, y, z, visibility
          for (let j = 0; j < noisyFeatures.length; j += 4) {
            // Drop some joints randomly (10% chance)
            if (Math.random() < 0.1) {
              noisyFeatures[j] = 0;
              noisyFeatures[j+1] = 0;
              noisyFeatures[j+2] = 0;
              noisyFeatures[j+3] = 0; // visibility 0
            } else {
              // Add Gaussian noise (simulating low res/poor light)
              noisyFeatures[j] += (Math.random() - 0.5) * 0.05;
              noisyFeatures[j+1] += (Math.random() - 0.5) * 0.05;
              noisyFeatures[j+2] += (Math.random() - 0.5) * 0.05;
            }
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

  async save(path = 'localstorage://exercise-model') {
    if (this.model) {
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
      console.warn("No saved model found", e);
      return false;
    }
  }
}
