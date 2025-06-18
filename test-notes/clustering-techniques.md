# Clustering Techniques

What I learned about unsupervised learning methods yesterday, referenced from [[machine-learning-fundamentals]].

## K-Means Clustering

This was the first clustering algorithm I understood properly.

### How It Works

1. Choose number of clusters (k)
2. Randomly place centroids
3. Assign points to nearest centroid
4. Update centroids
5. Repeat until convergence

```python
# K-means example I tried
from sklearn.cluster import KMeans

kmeans = KMeans(n_clusters=3)
clusters = kmeans.fit_predict(data)
```

## Applications I Discovered

- Customer segmentation for marketing
- Gene sequencing analysis
- Image compression

## Related Learning

- [[neural-networks]] - Can also be used for clustering
- [[practical-applications]] - Real-world clustering examples