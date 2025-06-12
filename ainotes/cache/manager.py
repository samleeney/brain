"""Cache management for persistent graph storage."""

import pickle
import json
from pathlib import Path
from typing import Optional, Dict, Any, List
from datetime import datetime
import hashlib

from ..models import KnowledgeGraph


class CacheManager:
    """Manages persistent cache of parsed graph."""
    
    CACHE_VERSION = "1.0"
    
    def __init__(self, notes_root: Path):
        self.notes_root = notes_root
        self.cache_dir = Path.home() / ".ainotes" / "cache"
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        # Create cache file names based on notes root path
        root_hash = hashlib.md5(str(notes_root).encode()).hexdigest()[:8]
        self.cache_file = self.cache_dir / f"{notes_root.name}_{root_hash}.pickle"
        self.metadata_file = self.cache_dir / f"{notes_root.name}_{root_hash}.meta.json"
    
    def load_cache(self) -> Optional[KnowledgeGraph]:
        """Load cached graph if valid."""
        if not self.cache_file.exists() or not self.metadata_file.exists():
            return None
        
        try:
            # Load and verify metadata
            with open(self.metadata_file, 'r') as f:
                metadata = json.load(f)
            
            # Check cache version compatibility
            if metadata.get('version') != self.CACHE_VERSION:
                return None
            
            # Check if any files have changed
            if not self._is_cache_valid(metadata):
                return None
            
            # Load the graph
            with open(self.cache_file, 'rb') as f:
                graph = pickle.load(f)
            
            return graph
            
        except (FileNotFoundError, json.JSONDecodeError, pickle.PickleError, KeyError):
            # If any error occurs, cache is invalid
            return None
    
    def save_cache(self, graph: KnowledgeGraph):
        """Save graph to cache."""
        try:
            # Create metadata
            metadata = {
                'version': self.CACHE_VERSION,
                'created': datetime.now().isoformat(),
                'notes_root': str(self.notes_root),
                'notes_count': len(graph.nodes),
                'file_timestamps': self._get_file_timestamps()
            }
            
            # Save graph
            with open(self.cache_file, 'wb') as f:
                pickle.dump(graph, f)
            
            # Save metadata
            with open(self.metadata_file, 'w') as f:
                json.dump(metadata, f, indent=2)
                
        except (IOError, pickle.PickleError, json.JSONEncodeError) as e:
            # If saving fails, clean up partial files
            self.clear_cache()
            raise e
    
    def clear_cache(self):
        """Clear the cache files."""
        try:
            if self.cache_file.exists():
                self.cache_file.unlink()
            if self.metadata_file.exists():
                self.metadata_file.unlink()
        except OSError:
            pass  # Ignore errors when cleaning up
    
    def get_cache_stats(self) -> Optional[Dict[str, Any]]:
        """Get cache statistics."""
        if not self.cache_file.exists() or not self.metadata_file.exists():
            return None
        
        try:
            # Load metadata
            with open(self.metadata_file, 'r') as f:
                metadata = json.load(f)
            
            # Get file size
            cache_size_bytes = self.cache_file.stat().st_size
            cache_size_mb = cache_size_bytes / (1024 * 1024)
            
            return {
                'cache_file': str(self.cache_file),
                'size_mb': cache_size_mb,
                'last_updated': metadata.get('created', 'Unknown'),
                'notes_count': metadata.get('notes_count', 0),
                'version': metadata.get('version', 'Unknown')
            }
            
        except (FileNotFoundError, json.JSONDecodeError):
            return None
    
    def _is_cache_valid(self, metadata: Dict[str, Any]) -> bool:
        """Check if cache is still valid based on file timestamps."""
        cached_timestamps = metadata.get('file_timestamps', {})
        current_timestamps = self._get_file_timestamps()
        
        # Check if any files were added or removed
        if set(cached_timestamps.keys()) != set(current_timestamps.keys()):
            return False
        
        # Check if any files were modified
        for file_path, cached_timestamp in cached_timestamps.items():
            current_timestamp = current_timestamps.get(file_path)
            if current_timestamp != cached_timestamp:
                return False
        
        return True
    
    def _get_file_timestamps(self) -> Dict[str, float]:
        """Get modification timestamps for all markdown files."""
        timestamps = {}
        
        try:
            for md_file in self.notes_root.rglob("*.md"):
                # Skip hidden files
                if any(part.startswith('.') for part in md_file.parts):
                    continue
                
                try:
                    timestamp = md_file.stat().st_mtime
                    # Use relative path as key for consistency
                    rel_path = str(md_file.relative_to(self.notes_root))
                    timestamps[rel_path] = timestamp
                except (OSError, ValueError):
                    continue
        except OSError:
            pass  # Handle cases where notes_root doesn't exist
        
        return timestamps
    
    def invalidate_changed_files(self, graph: KnowledgeGraph) -> List[Path]:
        """Check which files changed since cache and return them."""
        if not self.metadata_file.exists():
            return []
        
        try:
            with open(self.metadata_file, 'r') as f:
                metadata = json.load(f)
            
            cached_timestamps = metadata.get('file_timestamps', {})
            current_timestamps = self._get_file_timestamps()
            
            changed_files = []
            
            # Find modified files
            for rel_path, current_timestamp in current_timestamps.items():
                cached_timestamp = cached_timestamps.get(rel_path)
                if cached_timestamp != current_timestamp:
                    file_path = self.notes_root / rel_path
                    changed_files.append(file_path)
            
            # Find deleted files
            for rel_path in cached_timestamps:
                if rel_path not in current_timestamps:
                    file_path = self.notes_root / rel_path
                    changed_files.append(file_path)
            
            return changed_files
            
        except (FileNotFoundError, json.JSONDecodeError):
            return []
    
    def update_cache_incrementally(self, graph: KnowledgeGraph, 
                                 changed_files: List[Path]) -> bool:
        """Update cache with incremental changes."""
        try:
            # Update the graph's timestamp
            graph.last_updated = datetime.now()
            
            # Save updated graph
            self.save_cache(graph)
            return True
            
        except Exception:
            return False