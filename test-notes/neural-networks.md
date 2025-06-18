# Neural Networks

What I learned about deep learning yesterday - this builds on [[machine-learning-fundamentals]].

## The Breakthrough Moment

Today I finally understood how neural networks actually work! They're inspired by how biological neurons connect and fire.

## Architecture I Studied

### Perceptron
The simplest neural network - just one neuron:

```python
# Simple perceptron I implemented
import numpy as np

def perceptron(inputs, weights, bias):
    return np.dot(inputs, weights) + bias

# Activation function
def sigmoid(x):
    return 1 / (1 + np.exp(-x))
```

### Multi-Layer Networks
What I learned about deeper architectures:
- **Input Layer**: Receives the raw data
- **Hidden Layers**: Extract features and patterns
- **Output Layer**: Makes final predictions

## Training Process

The backpropagation algorithm I studied:
1. Forward pass: Data flows through network
2. Calculate loss: How wrong were we?
3. Backward pass: Adjust weights to reduce error
4. Repeat until convergence

## Applications I Explored

- Image recognition (like identifying cats vs dogs)
- Natural language processing
- Speech recognition
- Game playing (like AlphaGo)

## Deep Learning Frameworks

Tools I want to explore:
- TensorFlow
- PyTorch
- Keras

## Connection to Other Topics

- [[clustering-techniques]] - Neural networks can cluster too
- [[practical-applications]] - Where these networks shine
- [[machine-learning-fundamentals]] - The foundation I needed first